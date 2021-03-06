/**
 * The Force class.
 *
 * @author Michael Huyler
 */

/**
 * Types of Forces.
 *
 * @enum {number}
 */
const FORCE_TYPE = {
  FORCE_SIMP_GRAVITY: 0,
  FORCE_DRAG: 1,
  FORCE_WIND: 2,
  FORCE_SPRING: 3,
  FORCE_FLOCK: 4,
  FORCE_PLANETARY_GRAVITY: 5,
  FORCE_LINE_ATTRACTOR: 6,
  FORCE_VORTEX: 7,
  FORCE_UNIFORM_POINT_ATTRACTOR: 8,
  FORCE_POINT_ATTRACTOR: 9,
};

// How long the force should stay active
var TIMEOUT_NO_TIMEOUT = -1;
var TIMEOUT_INSTANT = 1;

/**
 * Creates a force in a particular direction for a specific duration.
 */
class Force {
  /**
   * @param {!FORCE_TYPE} type The type of force to implement.
   * @param {Array<number>} affected_particles The list of affected particles.
   */
  constructor(type, affected_particles) {
    this._type = type;
    this._p = affected_particles;
    this._enabled = true;
  }

  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get magnitude() {
    return this._magnitude;
  }
  get type() {
    return this._type;
  }
  get particles() {
    return this._p;
  }
  get pow() {
    return this._pow;
  }

  set x(new_x) {
    this._x = new_x;
    if ("undefined" !== typeof(this._x_a)) {
      this._x_a[0] = new_x;
    }
  }
  set y(new_y) {
    this._y = new_y;
    if ("undefined" !== typeof(this._x_a)) {
      this._x_a[1] = new_y;
    }
  }
  set z(new_z) {
    this._z = new_z;
    if ("undefined" !== typeof(this._x_a)) {
      this._x_a[2] = new_z;
    }
  }
  set magnitude(new_mag) {
    this._magnitude = new_mag;
  }
  set pow(new_pow) {
    this._pow = new_pow;
  }

  /**
   * Creates a constant vector force.
   *
   * @param {number} magnitude The magnitude of the force vector.
   * @param {number=} x The x component of the force vector.
   * @param {number=} y The y component of the force vector.
   * @param {number=} z The z component of the force vector.
   */
  init_vectored(magnitude = 1, x = 1, y = 1, z = 1) {
    this._magnitude = magnitude;
    this._x = x;
    this._y = y;
    this._z = z;
    return this;
  }

  /**
   * Creates a spring force.
   *
   * @param {number} k The spring constant.
   * @param {number} length The natural length of this spring.
   * @param {number} damp The damping of this spring.
   */
  init_spring(k, length, damp) {
    this._k = k;
    this._lr = length;
    this._d = damp;
    return this;
  }

  /**
   * Creates a flocking force.
   *
   * This approach follows Reynolds' "boids" method of flocking particles,
   * which is affected by 3* independent, and often competing forces:
   *  - Separation
   *  - Alignment
   *  - Cohesion
   *
   * * there can be more forces applied to boids, such as obstacle avoidance
   * and goal seeking, which are in fact used by this implementation.
   *
   * @param {number} min_rad The bois' small (focused) visual radius.
   * @param {number} max_rad The bois' large (boundary) visual radius.
   * @param {number} binocular_angle The bois' range of binocular vision (radians).
   * @param {number} monocular_angle The bois' range of monocular vision (radians).
   * @param {number} k_a The avoidance hyperparameter.
   * @param {number} k_v The velocity matching hyperparameter.
   * @param {number} k_c The centering hyperparameter.
   * @param {number} k_oa The obstacle-avoidance hyperparameter.
   * @param {number} k_gs The goal-seeking hyperparameter.
   */
  init_boid(min_rad, max_rad, binocular_angle, monocular_angle, k_a, k_v, k_c, k_oa, k_gs) {
    this._r1 = min_rad;
    this._r2 = max_rad;
    this._t1 = binocular_angle; // θ1
    this._t2 = monocular_angle; // θ2
    this._ka = k_a;
    this._kv = k_v;
    this._kc = k_c;
    this._koa = k_oa;
    this._kgs = k_gs;
    return this;
  }

  /**
   * Initializes an attractor force.
   *
   * @param {number} x The x position of the attractor.
   * @param {number} y The y position of the attractor.
   * @param {number} z The z position of the attractor.
   * @param {number} x The x component of the vector in the direction of the attractor.
   * @param {number} y The y component of the vector in the direction of the attractor.
   * @param {number} z The z component of the vector in the direction of the attractor.
   * @param {number=} p The "tightness" of the pull towards the attractor.
   * @param {number=} L The length of influence of the attractor.
   * @param {number=} r The radius of influence of the attractor.
   */
  init_attractor(x, y, z, a_x, a_y, a_z, p = 2, L = 0, r = 0) {
    this._x_a = glMatrix.vec3.fromValues(x, y, z);
    this._a = glMatrix.vec3.fromValues(a_x, a_y, a_z);
    this._pow = p;
    this._L = L;
    this._r = r;
    return this;
  }

  init_set(force_set) {
    this._set = force_set;
    return this;
  }

  /**
   * Enables this force.
   */
  enable() {
    this._enabled = true;
  }

  /**
   * Disables this force.
   */
  disable() {
    this._enabled = false;
  }

  /**
   * Applies this force to a given state vector.
   *
   * @param {!Float32Array} s The state vector to apply this force to.
   */
  apply(s) {
    if (!this._enabled)
      return;
    switch (this._type) {
      case FORCE_TYPE.FORCE_SIMP_GRAVITY:
        for (var i = 0; i < this._p.length; i++) {
          s[(this._p[i] * STATE_SIZE) + STATE.F_Z] += s[(this._p[i] * STATE_SIZE) + STATE.MASS] * this.magnitude;
        }
        break;
      case FORCE_TYPE.FORCE_DRAG:
        for (var i = 0; i < this._p.length; i++) {
          s[(this._p[i] * STATE_SIZE) + STATE.F_X] -= s[(this._p[i] * STATE_SIZE) + STATE.V_X] * (this.x * this.magnitude);
          s[(this._p[i] * STATE_SIZE) + STATE.F_Y] -= s[(this._p[i] * STATE_SIZE) + STATE.V_Y] * (this.y * this.magnitude);
          s[(this._p[i] * STATE_SIZE) + STATE.F_Z] -= s[(this._p[i] * STATE_SIZE) + STATE.V_Z] * (this.z * this.magnitude);
        }
        break;
      case FORCE_TYPE.FORCE_WIND:
        for (var i = 0; i < this._p.length; i++) {
          s[(this._p[i] * STATE_SIZE) + STATE.F_X] += this.x * this.magnitude * (Math.random() * 2 - 1);
          s[(this._p[i] * STATE_SIZE) + STATE.F_Y] += this.y * this.magnitude * (Math.random() * 2 - 1);
          s[(this._p[i] * STATE_SIZE) + STATE.F_Z] += this.z * this.magnitude * (Math.random() * 2 - 1);
        }
        break;
      case FORCE_TYPE.FORCE_SPRING:
        // Find the distance between pairs of points
        var Lx = s[(this._p[1] * STATE_SIZE) + STATE.P_X] - s[(this._p[0] * STATE_SIZE) + STATE.P_X];
        var Ly = s[(this._p[1] * STATE_SIZE) + STATE.P_Y] - s[(this._p[0] * STATE_SIZE) + STATE.P_Y];
        var Lz = s[(this._p[1] * STATE_SIZE) + STATE.P_Z] - s[(this._p[0] * STATE_SIZE) + STATE.P_Z];
        var distance = Math.sqrt(Math.pow(Lx, 2) + Math.pow(Ly, 2) + Math.pow(Lz, 2));
        // Find L, the spring displacement length
        var L = distance - this._lr;
        // Apply Hook's Law
        // Normalize the vector [Lx, Ly, Lz], multiply L by the spring constant
        // and limit the force for stability
        var Fx = Math.min(this._k * L * Lx / distance, 12);
        var Fy = Math.min(this._k * L * Ly / distance, 12);
        var Fz = Math.min(this._k * L * Lz / distance, 12);
        // Dampen the forces
        // Multiply damping coeff. by difference in velocities of particles and
        // by the square of the normalized L vector
        // TODO Wrong implementation: currently dampens the entire velocity vector, not the relative velocity between two particles
        // Fx += -1 * this._d * s[(this._p[0] * STATE_SIZE) + STATE.V_X] - s[(this._p[1] * STATE_SIZE) + STATE.V_X] * Math.pow(Lx / distance, 2);
        // Fy += -1 * this._d * s[(this._p[0] * STATE_SIZE) + STATE.V_Y] - s[(this._p[1] * STATE_SIZE) + STATE.V_Y] * Math.pow(Ly / distance, 2);
        // Fz += -1 * this._d * s[(this._p[0] * STATE_SIZE) + STATE.V_Z] - s[(this._p[1] * STATE_SIZE) + STATE.V_Z] * Math.pow(Lz / distance, 2);
        // Apply force to P0, and inverse force to P1
        s[(this._p[0] * STATE_SIZE) + STATE.F_X] += Fx;
        s[(this._p[0] * STATE_SIZE) + STATE.F_Y] += Fy;
        s[(this._p[0] * STATE_SIZE) + STATE.F_Z] += Fz;
        s[(this._p[1] * STATE_SIZE) + STATE.F_X] += -Fx;
        s[(this._p[1] * STATE_SIZE) + STATE.F_Y] += -Fy;
        s[(this._p[1] * STATE_SIZE) + STATE.F_Z] += -Fz;
        break;
      case FORCE_TYPE.FORCE_FLOCK:
        // Our current boid
        var x_i = glMatrix.vec3.create();
        // Our 'other' boid
        var x_j = glMatrix.vec3.create();
        // The 'predator'
        const x_p = glMatrix.vec3.fromValues(
          s[(BOID_PARTICLE_COUNT - 1) * STATE_SIZE + STATE.P_X],
          s[(BOID_PARTICLE_COUNT - 1) * STATE_SIZE + STATE.P_Y],
          s[(BOID_PARTICLE_COUNT - 1) * STATE_SIZE + STATE.P_Z]);
        // The 'goal'
        const x_g = glMatrix.vec3.fromValues(
          boid.force_set[3].x,
          boid.force_set[3].y,
          boid.force_set[3].z);
        // The vector from current to other
        var x_ij = glMatrix.vec3.create();
        // The vector from current to predator
        var x_ip = glMatrix.vec3.create();
        // The vector from the current to the goal
        var x_ig = glMatrix.vec3.create();
        // The directional vector from current to other
        var x_hat = glMatrix.vec3.create();
        // The distance from current to other
        var d_ij = 0;
        // The distance from current to predator
        var d_ip = 0;
        // The distance from current to goal
        var d_ig = 0;
        // The angle between current and other
        var t_ij = 0;
        // The accumulated acceleration
        var a_i = glMatrix.vec3.create(); // [a_ij^a, a_ij^v, a_ij^c]
        // The distance weight
        var k_d = 0;
        // The visual field weight
        var k_t = 1; // 0;
        for (var i = 0; i < this._p.length; i++) {
          x_i = glMatrix.vec3.fromValues(
            s[(this._p[i] * STATE_SIZE) + STATE.P_X],
            s[(this._p[i] * STATE_SIZE) + STATE.P_Y],
            s[(this._p[i] * STATE_SIZE) + STATE.P_Z]);
          glMatrix.vec3.zero(a_i);
          for (var j = 0; j < this._p.length; j++) {
            x_j = glMatrix.vec3.fromValues(
              s[(this._p[j] * STATE_SIZE) + STATE.P_X],
              s[(this._p[j] * STATE_SIZE) + STATE.P_Y],
              s[(this._p[j] * STATE_SIZE) + STATE.P_Z]);
            x_ij = glMatrix.vec3.sub(x_ij, x_j, x_i);
            d_ij = glMatrix.vec3.length(x_ij);
            t_ij = glMatrix.vec3.angle(x_ij,
              glMatrix.vec3.fromValues(
                s[(this._p[j] * STATE_SIZE) + STATE.V_X],
                s[(this._p[j] * STATE_SIZE) + STATE.V_Y],
                s[(this._p[j] * STATE_SIZE) + STATE.V_Z]));
            x_hat = glMatrix.vec3.scale(x_hat, x_ij, d_ij);
            // This boid is the current boid, is too far away, or is in a blind spot
            if (i == j || d_ij == 0 || d_ij > this._r2 || t_ij > this._t2 * 0.5)
              continue;
            k_d = d_ij < this._r1 ? 1 : (this._r2 - d_ij) / (this._r2 - this._r1);
            k_t = t_ij < (this._t1 * 0.5) ? 1 : (this._t2 * 0.5 - t_ij) / (this._t2 * 0.5 - this._t1 * 0.5);
            /* Collision avoidance */
            // a_ij^a = -(k_a / d_ij) * x_hat
            glMatrix.vec3.add(a_i, a_i,
              glMatrix.vec3.scale(x_hat, x_hat, k_t * k_d * (-1 * this._ka / d_ij)));
            /* Velocity matching */
            // a_ij^v = k_v * (v_j - v_i)
            glMatrix.vec3.add(a_i, a_i,
              glMatrix.vec3.scale(
                glMatrix.vec3.create(), // 'out' not needed
                glMatrix.vec3.sub(
                  glMatrix.vec3.create(), // 'out' not needed
                  glMatrix.vec3.fromValues(
                    s[(this._p[j] * STATE_SIZE) + STATE.V_X],
                    s[(this._p[j] * STATE_SIZE) + STATE.V_Y],
                    s[(this._p[j] * STATE_SIZE) + STATE.V_Z]),
                  glMatrix.vec3.fromValues(
                    s[(this._p[i] * STATE_SIZE) + STATE.V_X],
                    s[(this._p[i] * STATE_SIZE) + STATE.V_Y],
                    s[(this._p[i] * STATE_SIZE) + STATE.V_Z])),
                k_t * k_d * this._kv));
            /* Centering */
            // a_ij^c = k_c * x_ij
            glMatrix.vec3.add(a_i, a_i,
              glMatrix.vec3.scale(x_ij, x_ij, k_t * k_d * this._kc));
            /* Obstacle Avoidance */
            // Hardcoded avoidance of particle [BOID_PARTICLE_COUNT - 1]
            // a_ix^oa = -(k_oa / d_ip) * x_ip/d_ip
            x_ip = glMatrix.vec3.sub(x_ip, x_p, x_i);
            d_ip = glMatrix.vec3.length(x_ip);
            glMatrix.vec3.add(a_i, a_i,
              glMatrix.vec3.scale(x_ip, x_ip, (-1 * this._koa / d_ip) / d_ip));
            /* Goal Seeking */
            // Seeks the same goals as the predator's random walk, but will
            // avoid getting too close to the predator
            // a_ij^gs = k_gs * x_ig
            x_ig = glMatrix.vec3.sub(x_ig, x_g, x_i);
            d_ig = glMatrix.vec3.length(x_ig);
            glMatrix.vec3.add(a_i, a_i,
              glMatrix.vec3.scale(x_ig, x_ig, this._kgs / d_ig));
          }
          s[(this._p[i] * STATE_SIZE) + STATE.F_X] += a_i[0];
          s[(this._p[i] * STATE_SIZE) + STATE.F_Y] += a_i[1];
          s[(this._p[i] * STATE_SIZE) + STATE.F_Z] += a_i[2];
        }
        break;
      case FORCE_TYPE.FORCE_LINE_ATTRACTOR:
        // attractor position
        const x_a = this._x_a;
        // unit vector direction of x_a
        const a = this._a;
        // current particle position
        var x_i = glMatrix.vec3.create();
        // vector from x_a to x_i
        var x_ai = glMatrix.vec3.create();
        // length of x_ai in the direction of a
        var l_ai = 0;
        // vector to x_i orthogonal to a
        var r_ai = glMatrix.vec3.create();
        // magnitude of r_ai
        var r = 0;
        // additive accelerator operator
        var a_ai = glMatrix.vec3.create();
        // closest distance to the line attractor an affected particle can be
        var epsilon = 0.01;
        for (var i = 0; i < this._p.length; i++) {
          x_i = glMatrix.vec3.fromValues(
            s[(this._p[i] * STATE_SIZE) + STATE.P_X],
            s[(this._p[i] * STATE_SIZE) + STATE.P_Y],
            s[(this._p[i] * STATE_SIZE) + STATE.P_Z]
          );
          x_ai = glMatrix.vec3.sub(x_ai, x_i, x_a);
          l_ai = glMatrix.vec3.dot(x_ai, a);
          if (epsilon <= l_ai && l_ai < this._L) {
            r_ai = glMatrix.vec3.scaleAndAdd(r_ai, x_ai, a, -l_ai);
            r = glMatrix.vec3.len(r_ai);
            a_ai = glMatrix.vec3.scale(a_ai, r_ai, -9.8 * Math.pow(r, (this._pow + 1)));
            s[(this._p[i] * STATE_SIZE) + STATE.F_X] += a_ai[0];
            s[(this._p[i] * STATE_SIZE) + STATE.F_Y] += a_ai[1];
            s[(this._p[i] * STATE_SIZE) + STATE.F_Z] += a_ai[2];
          }
        }
        break;
      case FORCE_TYPE.FORCE_VORTEX:
        // vortex position
        const x_v = this._x_a;
        // unit vector direction of x_v
        const v = this._a;
        // current point position
        var x_i = glMatrix.vec3.create();
        // vector from x_v to x_i
        var x_vi = glMatrix.vec3.create();
        // length of x_vi in the direction of v
        var l_vi = 0;
        // vector to x_i orthogonal to v
        var r_i = glMatrix.vec3.create();
        // magnitude of r_i
        var r = 0;
        // closest distance to the vortex axis an affected particle can be
        var epsilon = 0.01;
        // rotational frequency at the edge of the vortex
        const f_R = 2;
        // maximum rotational frequency
        const f_max = Math.pow(10, f_R + 1);
        // rotational frequency of x_i at distance r from the vortex-s axis
        var f_i = 0;
        // angular velocity
        var ω = 0;
        // additive velocity operator
        var v_vi = glMatrix.vec3.create();
        for (var i = 0; i < this._p.length; i++) {
          x_i = glMatrix.vec3.fromValues(
            s[(this._p[i] * STATE_SIZE) + STATE.P_X],
            s[(this._p[i] * STATE_SIZE) + STATE.P_Y],
            s[(this._p[i] * STATE_SIZE) + STATE.P_Z]
          );
          x_vi = glMatrix.vec3.sub(x_vi, x_i, x_v);
          l_vi = glMatrix.vec3.dot(v, x_vi);
          if (epsilon <= l_vi && l_vi < this._L) {
            r_i = glMatrix.vec3.scaleAndAdd(r_i, x_vi, v, -l_vi);
            r = glMatrix.vec3.len(r_i);
            if (r < this._r) {
              f_i = Math.min(f_max, Math.pow(this._r / r, this._pow) * f_R);
              ω = 2 * Math.PI * f_i;
              v_vi = glMatrix.vec3.rotateZ(v_vi, x_i, x_v, ω);
              s[(this._p[i] * STATE_SIZE) + STATE.V_X] += v_vi[0] - x_i[0];
              s[(this._p[i] * STATE_SIZE) + STATE.V_Y] += v_vi[1] - x_i[1];
              s[(this._p[i] * STATE_SIZE) + STATE.V_Z] += v_vi[2] - x_i[2];
            }
          }
        }
        break;
      case FORCE_TYPE.FORCE_UNIFORM_POINT_ATTRACTOR:
        var dir = glMatrix.vec3.create();
        for (var i = 0; i < this._p.length; i++) {
          dir = glMatrix.vec3.sub(dir,
            this._x_a,
            glMatrix.vec3.fromValues(
              s[(this._p[i] * STATE_SIZE) + STATE.P_X],
              s[(this._p[i] * STATE_SIZE) + STATE.P_Y],
              s[(this._p[i] * STATE_SIZE) + STATE.P_Z]
            ));
          s[(this._p[i] * STATE_SIZE) + STATE.F_X] += dir[0];
          s[(this._p[i] * STATE_SIZE) + STATE.F_Y] += dir[1];
          s[(this._p[i] * STATE_SIZE) + STATE.F_Z] += dir[2];
        }
        break;
      case FORCE_TYPE.FORCE_POINT_ATTRACTOR:
        // Vector from attractor to particle position
        var dir = glMatrix.vec3.create();
        // Length of dir
        var len = 0;
        for (var i = 0; i < this._p.length; i++) {
          dir = glMatrix.vec3.sub(dir,
            this._x_a,
            glMatrix.vec3.fromValues(
              s[(this._p[i] * STATE_SIZE) + STATE.P_X],
              s[(this._p[i] * STATE_SIZE) + STATE.P_Y],
              s[(this._p[i] * STATE_SIZE) + STATE.P_Z]
            ));
          len = glMatrix.vec3.length(dir);
          if (len > this._L)
            continue;
          // Using `this._r` because I'm lazy and don't want to include another parameter in the init function
          dir = glMatrix.vec3.scale(dir, dir, this._r / Math.pow(len, (this._pow + 1)));
          s[(this._p[i] * STATE_SIZE) + STATE.F_X] += dir[0];
          s[(this._p[i] * STATE_SIZE) + STATE.F_Y] += dir[1];
          s[(this._p[i] * STATE_SIZE) + STATE.F_Z] += dir[2];
        }
        break;
      default:
        console.log("Unimplemented force type: " + this._type);
        return;
    }
  }

  /**
   * Toggles drawing of this force, and updates vertices when it changes.
   *
   * @param {!VBOBox} vbo The VBO to update.
   * @param {number} index The index of this force.
   * @param {boolean} enabled Whether this force should be drawn.
   * @param {Array<number>} p0 A point on the line representing this force.
   * @param {Array<number>} p1 A point on the line representing this force.
   */
  draw(vbo, index, enabled, p0, p1) {
    var r = Math.random();
    var g = Math.random();
    var b = Math.random();
    var epsilon = 0.01;
    enabled = enabled && this._enabled;
    switch (this._type) {
      case FORCE_TYPE.FORCE_SPRING:
        var len = Math.sqrt(Math.pow(p1[0] - p0[0], 2) + Math.pow(p1[1] - p0[1], 2) + Math.pow(p1[2] - p0[2], 2));
        if (Math.abs(len - this._lr) < epsilon) {
          // Approximately natural length
          r = g = b = 1;
        } else {
          var delta = 1 - Math.abs(len - this._lr) / this._lr;
          if (delta <= 0.33) {
            g = b = delta;
            r = 1;
          } else {
            r = g = delta;
            b = 1;
          }
        }
        vbo.reload(
          new Float32Array([
            p0[0], p0[1], p0[2], r, g, b, enabled | 0,
            p1[0], p1[1], p1[2], r, g, b, enabled | 0,
          ]),
          index * 7 * 2);
        break;
      default:
        break;
    }
  }

}
