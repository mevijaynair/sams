// auditLog.js — audit trail for super_admin and super_super_admin actions
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

export const AuditLog = {
  // Log an action (create/update/delete)
  log(req, {
    tenantId = null,
    entityType,
    entityId,
    action,
    beforeState = null,
    afterState = null,
    reason = null
  }) {
    const id = randomUUID();
    const actor = req.user || {};

    db.prepare(`
      INSERT INTO audit_log (
        id, tenant_id, actor_id, actor_role, entity_type, entity_id,
        action, before_state, after_state, reason, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      actor.id || 'system',
      actor.role || 'system',
      entityType,
      entityId,
      action,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      reason,
      req.ip || req.connection?.remoteAddress || 'unknown',
      new Date().toISOString()
    );
    return id;
  },

  // Get audit logs (paginated, filtered)
  list({ tenantId = null, actorId = null, entityType = null, limit = 100, offset = 0 } = {}) {
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(tenantId);
    }
    if (actorId) {
      sql += ' AND actor_id = ?';
      params.push(actorId);
    }
    if (entityType) {
      sql += ' AND entity_type = ?';
      params.push(entityType);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = db.prepare(sql).all(...params);

    // Parse JSON states
    return logs.map(log => ({
      ...log,
      before_state: log.before_state ? JSON.parse(log.before_state) : null,
      after_state: log.after_state ? JSON.parse(log.after_state) : null
    }));
  },

  // Get audit logs for a specific entity (e.g., all changes to a student)
  getEntityHistory(entityType, entityId) {
    return db.prepare(`
      SELECT * FROM audit_log
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `).all(entityType, entityId).map(log => ({
      ...log,
      before_state: log.before_state ? JSON.parse(log.before_state) : null,
      after_state: log.after_state ? JSON.parse(log.after_state) : null
    }));
  },

  // Get audit logs by actor (who made changes)
  getActorLogs(actorId, limit = 100) {
    return db.prepare(`
      SELECT * FROM audit_log
      WHERE actor_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(actorId, limit).map(log => ({
      ...log,
      before_state: log.before_state ? JSON.parse(log.before_state) : null,
      after_state: log.after_state ? JSON.parse(log.after_state) : null
    }));
  },

  // Get audit summary for super_admin dashboard
  getSummary(tenantId = null, daysBack = 30) {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const sql = `
      SELECT
        entity_type,
        action,
        COUNT(*) AS count
      FROM audit_log
      WHERE created_at > ?
      ${tenantId ? 'AND tenant_id = ?' : ''}
      GROUP BY entity_type, action
      ORDER BY count DESC
    `;

    const params = [cutoff];
    if (tenantId) params.push(tenantId);

    return db.prepare(sql).all(...params);
  },

  // Export audit logs as JSON for compliance
  export(filters = {}) {
    return this.list({ ...filters, limit: 10000 });
  }
};
