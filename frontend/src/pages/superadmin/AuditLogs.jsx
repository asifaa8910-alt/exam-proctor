import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import Modal from '../../components/Modal';
import { 
  Search, Calendar, Filter, Trash2, Eye, ShieldAlert, 
  RotateCcw, Trash, AlertTriangle, CheckCircle, XCircle, 
  ChevronLeft, ChevronRight, Laptop, Info, CalendarRange
} from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Details State
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch Audit Logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(action && { action }),
        ...(role && { role }),
        ...(status && { status }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const data = await api.get(`/audit-logs?${queryParams.toString()}`);
      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, action, role, status, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Actions
  const handleResetFilters = () => {
    setSearch('');
    setAction('');
    setRole('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleOpenDetail = async (logId) => {
    try {
      const data = await api.get(`/audit-logs/${logId}`);
      if (data.success) {
        setSelectedLog(data.log);
        setShowDetailModal(true);
      }
    } catch (err) {
      alert(`Failed to fetch log details: ${err.message}`);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this specific audit log entry?')) return;
    try {
      setDeletingId(logId);
      const data = await api.delete(`/audit-logs/${logId}`);
      if (data.success) {
        setLogs(prev => prev.filter(l => l._id !== logId));
        setTotal(t => t - 1);
      }
    } catch (err) {
      alert(`Failed to delete log entry: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecuteCleanup = async () => {
    try {
      const data = await api.delete(`/audit-logs/cleanup?days=${cleanupDays}`);
      if (data.success) {
        alert(data.message);
        setShowCleanupModal(false);
        fetchLogs();
      }
    } catch (err) {
      alert(`Failed to perform log cleanup: ${err.message}`);
    }
  };

  const formatShortUserAgent = (uaString) => {
    if (!uaString) return 'Unknown';
    if (uaString.includes('Firefox')) return 'Firefox';
    if (uaString.includes('Chrome') && uaString.includes('Safari')) return 'Chrome';
    if (uaString.includes('Safari')) return 'Safari';
    if (uaString.includes('Postman')) return 'Postman';
    if (uaString.includes('curl')) return 'curl';
    return uaString.substring(0, 15) + '...';
  };

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>System Audit Database</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Permanently stored activities from MongoDB. Total records: <strong>{total}</strong>
          </p>
        </div>
        <button 
          onClick={() => setShowCleanupModal(true)}
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
        >
          <Trash size={16} /> Cleanup Database
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: 'var(--accent)' }} /> Query Filters
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* User Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Search Username</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Type name..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Action Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>System Action</label>
            <select 
              value={action} 
              onChange={e => { setAction(e.target.value); setPage(1); }}
              style={{ width: '100%' }}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="FAILED_LOGIN">FAILED_LOGIN</option>
              <option value="REGISTER">REGISTER</option>
              <option value="CREATE_EXAM">CREATE_EXAM</option>
              <option value="UPDATE_EXAM">UPDATE_EXAM</option>
              <option value="DELETE_EXAM">DELETE_EXAM</option>
              <option value="START_EXAM">START_EXAM</option>
              <option value="SUBMIT_EXAM">SUBMIT_EXAM</option>
              <option value="GRADE_EXAM">GRADE_EXAM</option>
              <option value="PUBLISH_RESULTS">PUBLISH_RESULTS</option>
              <option value="CREATE_QUESTION">CREATE_QUESTION</option>
              <option value="UPDATE_QUESTION">UPDATE_QUESTION</option>
              <option value="DELETE_QUESTION">DELETE_QUESTION</option>
              <option value="CHANGE_ROLE">CHANGE_ROLE</option>
              <option value="CHANGE_PASSWORD">CHANGE_PASSWORD</option>
              <option value="PROCTORING_VIOLATION">PROCTORING_VIOLATION</option>
              <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
              <option value="CLEAR_SUBMISSIONS_LOGS">CLEAR_SUBMISSIONS_LOGS</option>
              <option value="GENERATE_MOCK_DATA">GENERATE_MOCK_DATA</option>
            </select>
          </div>

          {/* User Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>User Role</label>
            <select 
              value={role} 
              onChange={e => { setRole(e.target.value); setPage(1); }}
              style={{ width: '100%' }}
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="examiner">Examiner</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Execution Status</label>
            <select 
              value={status} 
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
          {/* Start Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* End Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', gridColumn: 'span 2' }}>
            <button 
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
            <button 
              onClick={fetchLogs}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, background: 'var(--accent)' }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>Timestamp</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>User Email</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>Role</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>Action</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>Description</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>IP Address</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>Device</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <span className="spinner" style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                      Loading logs from MongoDB database...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records matched the query.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  let roleColor = 'var(--text-secondary)';
                  let roleBg = 'var(--bg-input)';
                  if (log.userRole === 'superadmin') { roleColor = 'var(--danger)'; roleBg = 'var(--danger-bg)'; }
                  else if (log.userRole === 'examiner' || log.userRole === 'admin') { roleColor = 'var(--warning)'; roleBg = 'var(--warning-bg)'; }
                  else if (log.userRole === 'student') { roleColor = 'var(--info)'; roleBg = 'var(--info-bg)'; }

                  const isSuccess = log.status === 'success';

                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                      {/* Timestamp */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </td>

                      {/* User Email */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 500 }}>{log.userName || 'System'}</div>
                        {log.userId?.email ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.userId.email}</div>
                        ) : log.userId ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {log.userId._id || log.userId}</div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>system_event</div>
                        )}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                          color: roleColor, background: roleBg, textTransform: 'uppercase'
                        }}>
                          {log.userRole}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 20px' }}>
                        <code style={{ 
                          padding: '4px 6px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 
                        }}>
                          {log.action}
                        </code>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '14px 20px', maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.description}>
                          {log.description}
                        </div>
                      </td>

                      {/* IP Address */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                        {log.ipAddress}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: isSuccess ? 'var(--success)' : 'var(--danger)' }}>
                          {isSuccess ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {log.status}
                        </span>
                      </td>

                      {/* Device */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }} title={log.userAgent}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Laptop size={14} style={{ color: 'var(--text-muted)' }} />
                          {formatShortUserAgent(log.userAgent)}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleOpenDetail(log._id)}
                            className="btn btn-secondary" 
                            style={{ padding: '6px 8px', minWidth: 'auto', background: 'transparent', border: 'none', color: 'var(--info)' }}
                            title="View Metadata"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteLog(log._id)}
                            className="btn btn-secondary" 
                            disabled={deletingId === log._id}
                            style={{ padding: '6px 8px', minWidth: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)' }}
                            title="Delete Log"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total logs)
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', minWidth: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', minWidth: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LOG DETAILS MODAL */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Audit Event Inspector">
        {selectedLog && (
          <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Actor Details</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedLog.userName}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>Role: {selectedLog.userRole}</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>System Event</div>
                <code style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>{selectedLog.action}</code>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>{new Date(selectedLog.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Action Log Description</div>
              <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--radius-sm)', lineHeight: 1.4 }}>
                {selectedLog.description}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>IP Address</div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>{selectedLog.ipAddress}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Device (User Agent)</div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedLog.userAgent}>
                  {selectedLog.userAgent}
                </div>
              </div>
            </div>

            {selectedLog.entityType && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Entity Target</div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontWeight: 500 }}>
                    {selectedLog.entityType} {selectedLog.entityId ? `(ID: ${selectedLog.entityId})` : ''}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Structured Metadata JSON</div>
              <pre style={{ 
                padding: '14px', background: '#0e1117', color: '#c9d1d9', borderRadius: 'var(--radius-md)', 
                overflowX: 'auto', margin: 0, fontSize: '0.75rem', border: '1px solid #30363d', fontFamily: 'monospace'
              }}>
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Close Inspector</button>
            </div>
          </div>
        )}
      </Modal>

      {/* DATABASE CLEANUP MODAL */}
      <Modal isOpen={showCleanupModal} onClose={() => setShowCleanupModal(false)} title="Audit Database Housekeeping">
        <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: 4 }}>Destructive Administrative Action</strong>
              This will permanently delete old audit logs from the MongoDB database matching the selected threshold. This action cannot be undone.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select Threshold Age</label>
            <select 
              value={cleanupDays} 
              onChange={e => setCleanupDays(parseInt(e.target.value))}
              style={{ width: '100%', height: 42 }}
            >
              <option value="30">Delete logs older than 30 Days (1 Month)</option>
              <option value="60">Delete logs older than 60 Days (2 Months)</option>
              <option value="90">Delete logs older than 90 Days (3 Months)</option>
              <option value="180">Delete logs older than 180 Days (6 Months)</option>
              <option value="365">Delete logs older than 365 Days (1 Year)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCleanupModal(false)} className="btn btn-secondary">Cancel</button>
            <button 
              onClick={handleExecuteCleanup} 
              className="btn btn-primary"
              style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}
            >
              Execute Database Wiping
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
