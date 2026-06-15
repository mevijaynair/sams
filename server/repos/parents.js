// parents.js — parent/guardian management with multi-child linking
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

export const Parents = {
  // Create a parent/guardian
  create(tenantId, { name, email, phone, relationship = 'Parent' }) {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO parents (id, tenant_id, name, email, phone, relationship, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, tenantId, name, email || null, phone || null, relationship, new Date().toISOString());
    return this.getById(id);
  },

  // Get parent by ID
  getById(id) {
    return db.prepare('SELECT * FROM parents WHERE id = ?').get(id);
  },

  // List all parents for a tenant
  list(tenantId) {
    return db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM student_parents WHERE parent_id = p.id) AS child_count
      FROM parents p
      WHERE p.tenant_id = ?
      ORDER BY p.name
    `).all(tenantId);
  },

  // Get parent with their children
  getWithChildren(parentId) {
    const parent = this.getById(parentId);
    if (!parent) return null;
    const children = db.prepare(`
      SELECT s.*, sp.is_primary
      FROM students s
      JOIN student_parents sp ON s.id = sp.student_id
      WHERE sp.parent_id = ?
      ORDER BY s.name
    `).all(parentId);
    return { ...parent, children };
  },

  // Update parent info
  update(id, { name, email, phone, relationship }) {
    db.prepare(`
      UPDATE parents SET name = ?, email = ?, phone = ?, relationship = ?
      WHERE id = ?
    `).run(name, email || null, phone || null, relationship, id);
    return this.getById(id);
  },

  // Deactivate parent
  deactivate(id) {
    db.prepare('UPDATE parents SET active = 0 WHERE id = ?').run(id);
  },

  // Delete parent (removes all child links too)
  delete(id) {
    db.prepare('DELETE FROM student_parents WHERE parent_id = ?').run(id);
    db.prepare('DELETE FROM parents WHERE id = ?').run(id);
  },

  // Link a student to a parent
  linkStudent(tenantId, studentId, parentId, isPrimary = 0) {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO student_parents (id, tenant_id, student_id, parent_id, is_primary, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, parent_id) DO UPDATE SET is_primary = ?
    `).run(id, tenantId, studentId, parentId, isPrimary, isPrimary);
  },

  // Unlink a student from a parent
  unlinkStudent(studentId, parentId) {
    db.prepare('DELETE FROM student_parents WHERE student_id = ? AND parent_id = ?')
      .run(studentId, parentId);
  },

  // Get all parents for a student
  getStudentParents(studentId) {
    return db.prepare(`
      SELECT p.*, sp.is_primary
      FROM parents p
      JOIN student_parents sp ON p.id = sp.parent_id
      WHERE sp.student_id = ?
      ORDER BY sp.is_primary DESC, p.name
    `).all(studentId);
  },

  // Set primary contact for a student
  setPrimaryContact(studentId, parentId) {
    db.prepare('UPDATE student_parents SET is_primary = 0 WHERE student_id = ?').run(studentId);
    db.prepare('UPDATE student_parents SET is_primary = 1 WHERE student_id = ? AND parent_id = ?')
      .run(studentId, parentId);
  }
};
