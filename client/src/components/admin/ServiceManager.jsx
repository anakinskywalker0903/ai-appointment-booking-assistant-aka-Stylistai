import React, { useState, useMemo } from 'react';
import { useAppointments } from '../../context/AppointmentContext';
import './ServiceManager.css';

export default function ServiceManager({ onShowToast }) {
  const {
    services,
    staffList,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
    assignServicesToStaff,
  } = useAppointments();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [assigningService, setAssigningService] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    duration: 45,
    price: 35,
    description: '',
  });

  // Calculate high-level stats
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter(s => s.active).length;
    const avgPrice = total > 0 ? (services.reduce((acc, s) => acc + Number(s.price), 0) / total).toFixed(2) : 0;
    return { total, active, avgPrice };
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [services, searchQuery]);

  const handleOpenAdd = () => {
    setFormData({ name: '', duration: 45, price: 35, description: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      duration: service.duration,
      price: service.price,
      description: service.description || '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingService) {
      updateService(editingService.id, formData);
      onShowToast?.(`Service "${formData.name}" updated successfully.`);
      setEditingService(null);
    } else {
      addService(formData);
      onShowToast?.(`Service "${formData.name}" added to catalog.`);
      setShowAddModal(false);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from salon services?`)) {
      deleteService(id);
      onShowToast?.(`Service "${name}" deleted.`);
    }
  };

  // Toggle stylist assignment for a given service
  const handleToggleStylistForService = (staffId, serviceId) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    const hasService = staff.assignedServiceIds?.includes(serviceId);
    const updatedIds = hasService
      ? staff.assignedServiceIds.filter(id => id !== serviceId)
      : [...(staff.assignedServiceIds || []), serviceId];

    assignServicesToStaff(staffId, updatedIds);
    onShowToast?.(`Stylist ${staff.name} qualifications updated.`);
  };

  return (
    <div className="service-manager">
      {/* ── Header ── */}
      <div className="service-manager-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--charcoal-dark)', margin: 0 }}>
            Salon Services & Treatments Catalog
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--charcoal-light)', margin: '4px 0 0 0' }}>
            Configure treatment durations, pricing, active availability, and assigned stylist certifications.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add New Service
        </button>
      </div>

      {/* ── KPI Stats ── */}
      <div className="service-stats-grid">
        <div className="service-stat-card">
          <div className="service-stat-label">Total Services</div>
          <div className="service-stat-val">{stats.total}</div>
        </div>
        <div className="service-stat-card">
          <div className="service-stat-label">Active on Roster</div>
          <div className="service-stat-val" style={{ color: 'var(--success)' }}>{stats.active}</div>
        </div>
        <div className="service-stat-card">
          <div className="service-stat-label">Average Treatment Price</div>
          <div className="service-stat-val" style={{ color: 'var(--orange)' }}>${stats.avgPrice}</div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="service-toolbar">
        <input
          type="text"
          placeholder="Search treatments by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="service-search-input"
        />
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--charcoal-light)' }}>
          Showing {filteredServices.length} of {services.length} services
        </div>
      </div>

      {/* ── Table View ── */}
      <div className="service-table-wrapper">
        <table className="service-table">
          <thead>
            <tr>
              <th>Treatment & Description</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Qualified Stylists</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#666' }}>
                  No services matching your search query.
                </td>
              </tr>
            ) : (
              filteredServices.map((srv) => {
                // Find all staff who can perform this service
                const qualifiedStaff = staffList.filter(st =>
                  st.assignedServiceIds?.includes(srv.id)
                );

                return (
                  <tr key={srv.id}>
                    <td>
                      <div className="service-name-cell">
                        <strong>{srv.name}</strong>
                        {srv.description && (
                          <span className="service-desc-snippet">{srv.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="service-duration-badge">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                        {srv.duration} mins
                      </span>
                    </td>
                    <td>
                      <span className="service-price-tag">${Number(srv.price).toFixed(2)}</span>
                    </td>
                    <td>
                      <div className="stylist-badges-list">
                        {qualifiedStaff.length === 0 ? (
                          <span style={{ fontSize: '0.72rem', color: '#999', fontStyle: 'italic' }}>None assigned</span>
                        ) : (
                          qualifiedStaff.map(st => (
                            <span key={st.id} className="stylist-badge-pill">
                              {st.name}
                            </span>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => setAssigningService(srv)}
                          className="btn-assign-stylists"
                          title="Assign or unassign stylists for this service"
                        >
                          + Assign
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleServiceActive(srv.id)}
                        className={`active-toggle-btn ${srv.active ? 'is-active' : 'is-inactive'}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          {srv.active ? 'check_circle' : 'block'}
                        </span>
                        {srv.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="service-actions-cell">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(srv)}
                          className="btn-icon-action"
                          title="Edit Service"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(srv.id, srv.name)}
                          className="btn-icon-action danger"
                          title="Delete Service"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
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

      {/* ── Add / Edit Modal ── */}
      {(showAddModal || editingService) && (
        <div className="service-modal-overlay" onClick={() => { setShowAddModal(false); setEditingService(null); }}>
          <div className="service-modal-box" onClick={e => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>{editingService ? 'Edit Treatment' : 'Add New Salon Treatment'}</h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingService(null); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 900 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="service-modal-form">
              <div className="form-group-admin">
                <label>Treatment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keratin Smoothing Treatment"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row-admin">
                <div className="form-group-admin">
                  <label>Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={15}
                    step={15}
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group-admin">
                  <label>Price ($ USD)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={5}
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group-admin">
                <label>Description & Preparation Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe the treatment steps and client prep..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="service-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowAddModal(false); setEditingService(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Stylists Modal ── */}
      {assigningService && (
        <div className="service-modal-overlay" onClick={() => setAssigningService(null)}>
          <div className="service-modal-box" onClick={e => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>Assign Stylists: {assigningService.name}</h3>
              <button
                type="button"
                onClick={() => setAssigningService(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 900 }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: 16 }}>
              Select all stylists qualified to perform <strong>{assigningService.name}</strong>. Only assigned stylists will appear as options when clients book this treatment.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {staffList.map(st => {
                const isAssigned = st.assignedServiceIds?.includes(assigningService.id);
                return (
                  <div
                    key={st.id}
                    onClick={() => handleToggleStylistForService(st.id, assigningService.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1.5px solid var(--charcoal-dark)',
                      background: isAssigned ? '#eff6ff' : 'var(--surface-low)',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <strong>{st.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{st.role}</div>
                    </div>
                    <span className={`badge ${isAssigned ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {isAssigned ? '✓ Qualified' : '+ Not Assigned'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setAssigningService(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
