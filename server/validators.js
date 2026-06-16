// validators.js — schema validation for request bodies (no external dependencies).

export const Validators = {
  // Student schema
  student: {
    name: (v) => typeof v === 'string' && v.trim().length > 0 ? null : 'Name is required',
    age_group: (v) => ['U6-U9', 'U10-U13', 'U14-U18'].includes(v) ? null : 'Invalid age group',
    sport: (v) => typeof v === 'string' && v.trim().length > 0 ? null : 'Sport is required',
    fee_plan_type: (v) => ['monthly', 'per_session', 'package'].includes(v) ? null : 'Invalid fee plan type',
    fee_rate: (v) => typeof v === 'number' && v >= 0 ? null : 'Fee rate must be non-negative',
    eid_number: (v) => v === null || v === undefined || (typeof v === 'string' && v.length > 0) ? null : 'Invalid EID number',
    eid_expiry: (v) => v === null || v === undefined || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? null : 'Invalid EID expiry date (YYYY-MM-DD)',
  },

  // Parent schema
  parent: {
    name: (v) => typeof v === 'string' && v.trim().length > 0 ? null : 'Parent name is required',
    relationship: (v) => ['Parent', 'Guardian', 'Emergency Contact', 'Grandparent'].includes(v) ? null : 'Invalid relationship',
    email: (v) => v === null || v === undefined || (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ? null : 'Invalid email format',
    phone: (v) => v === null || v === undefined || (typeof v === 'string' && v.trim().length > 0) ? null : 'Invalid phone number',
  },

  // Attendance schema
  attendance: {
    student_id: (v) => typeof v === 'string' && v.length > 0 ? null : 'Student ID is required',
    session_date: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Invalid session date (YYYY-MM-DD)',
    present: (v) => typeof v === 'number' && (v === 0 || v === 1) ? null : 'Present must be 0 or 1',
  },

  // User schema
  user: {
    name: (v) => typeof v === 'string' && v.trim().length > 0 ? null : 'Name is required',
    email: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email format',
    password: (v) => typeof v === 'string' && v.length >= 6 ? null : 'Password must be at least 6 characters',
    role: (v) => ['super_admin', 'admin', 'coach'].includes(v) ? null : 'Invalid role',
  },

  // Tenant schema
  tenant: {
    name: (v) => typeof v === 'string' && v.trim().length > 0 ? null : 'Tenant name is required',
    sports: (v) => Array.isArray(v) && v.length > 0 && v.every(s => typeof s === 'string') ? null : 'Sports must be a non-empty array of strings',
  },
};

// Validate an object against a schema
export function validate(obj, schema) {
  const errors = {};
  for (const [key, validator] of Object.entries(schema)) {
    if (key in obj) {
      const error = validator(obj[key]);
      if (error) errors[key] = error;
    }
  }
  return Object.keys(errors).length === 0 ? null : errors;
}

// Middleware to validate request body against a schema
export function validateBody(schema) {
  return (req, res, next) => {
    const errors = validate(req.body || {}, schema);
    if (errors) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}
