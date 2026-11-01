import React, { useState } from 'react';
import { useAppointments } from '../../context/AppointmentContext';
import './StaffManager.css';

export default function StaffManager({ onShowToast }) {
  const {
    staffList,
    services,
    appointments,
    addStaff,
    updateStaff,
    toggleStaffActive,
  } = useAppointments();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Hair Stylist',
    bio: '',
    hours: '09:00 AM - 05:00 PM',
    assignedServiceIds: [],
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      role: 'Hair Stylist',
      bio: '',
      hours: '09:00 AM - 05:00 PM',
      assignedServiceIds: services.slice(0, 2).map(s => s.id),
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      role: staff.role,
      bio: staff.bio || '',
      hours: staff.hours || '09:00 AM - 05:00 PM',
      assignedServiceIds: staff.assignedServiceIds || [],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingStaff) {
      updateStaff(editingStaff.id, formData);
      onShowToast?.(`Stylist ${formData.name} updated.`);
      setEditingStaff(null);
    } else {
      addStaff(formData);
      onShowToast?.(`New stylist ${formData.name} added to roster.`);
      setShowAddModal(false);
    }
  };

  const handleToggleServiceAssignment = (serviceId) => {
    const current = formData.assignedServiceIds || [];
    const updated = current.includes(serviceId)
      ? current.filter(id => id !== serviceId)
      : [...current, serviceId];
    setFormData({ ...formData, assignedServiceIds: updated });
  };

  return (
    <div className="staff-manager">
      {/* ── Header ── */}
      <div className="staff-manager-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--charcoal-dark)', margin: 0 }}>
            Salon Stylist & Staff Roster
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--charcoal-light)', margin: '4px 0 0 0' }}>
            Manage staff members, their assigned service qualifications, and active work schedules.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
          Add Stylist
        </button>
      </div>

      {/* ── Stylist Cards Grid ── */}
      <div className="staff-cards-grid">
        {staffList.map((staff) => {
          // Count bookings for this staff member
          const staffBookings = appointments.filter(a =>
            a.employeeName &&
            (a.employeeName.toLowerCase().includes(staff.name.toLowerCase()) ||
             staff.name.toLowerCase().includes(a.employeeName.toLowerCase()))
          );

          // Get services assigned to this staff member
          const assignedServices = services.filter(s =>
            staff.assignedServiceIds?.includes(s.id)
          );

          return (
            <div key={staff.id} className="staff-roster-card">
              <div>
                <div className="staff-card-top">
                  <div className="staff-avatar-box">
                    <span className="material-symbols-outlined" style={{ fontSize: 26 }}>person</span>
                  </div>
                  <div className="staff-primary-info">
                    <h3 className="staff-name-title">{staff.name}</h3>
                    <div className="staff-role-sub">{staff.role}</div>
                  </div>
                </div>

                <div className="staff-card-body">
                  {staff.bio && (
                    <div style={{ color: '#555', fontStyle: 'italic', fontSize: '0.78rem' }}>
                      "{staff.bio}"
                    </div>
                  )}

                  <div className="staff-meta-row">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                    <span><strong>Hours:</strong> {staff.hours || '09:00 AM - 05:00 PM'}</span>
                  </div>

                  <div className="staff-meta-row">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_available</span>
                    <span><strong>Active Bookings:</strong> {staffBookings.length} appointment(s)</span>
                  </div>

                  <div className="staff-services-section">
                    <div className="staff-services-label">
                      Qualified Services ({assignedServices.length})
                    </div>
                    <div className="staff-services-tags">
                      {assignedServices.length === 0 ? (
                        <span style={{ fontSize: '0.72rem', color: '#888' }}>No services assigned</span>
                      ) : (
                        assignedServices.map(s => (
                          <span key={s.id} className="service-chip">
                            {s.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="staff-card-actions">
                <button
                  type="button"
                  onClick={() => toggleStaffActive(staff.id)}
                  className={`active-toggle-btn ${staff.active ? 'is-active' : 'is-inactive'}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                    {staff.active ? 'check_circle' : 'block'}
                  </span>
                  {staff.active ? 'Active' : 'Paused'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(staff)}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                  Edit Profile
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Modal ── */}
      {(showAddModal || editingStaff) && (
        <div className="service-modal-overlay" onClick={() => { setShowAddModal(false); setEditingStaff(null); }}>
          <div className="service-modal-box" onClick={e => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>{editingStaff ? `Edit Stylist: ${editingStaff.name}` : 'Add New Stylist to Team'}</h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingStaff(null); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 900 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="service-modal-form">
              <div className="form-group-admin">
                <label>Stylist Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row-admin">
                <div className="form-group-admin">
                  <label>Professional Role / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Colorist"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
                <div className="form-group-admin">
                  <label>Working Shift Hours</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:00 AM - 05:00 PM"
                    value={formData.hours}
                    onChange={e => setFormData({ ...formData, hours: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-admin">
                <label>Stylist Bio / Specialties</label>
                <input
                  type="text"
                  placeholder="e.g. Precision scissor cuts, beard sculpting, 5+ yrs exp."
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="form-group-admin">
                <label>Assigned Treatment Qualifications (Select All Applicable)</label>
                <div className="service-checkbox-grid">
                  {services.map(srv => {
                    const isChecked = formData.assignedServiceIds?.includes(srv.id);
                    return (
                      <label key={srv.id} className="service-checkbox-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleServiceAssignment(srv.id)}
                        />
                        <span>{srv.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="service-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowAddModal(false); setEditingStaff(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStaff ? 'Save Changes' : 'Add to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
