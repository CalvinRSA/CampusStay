import { useState, useEffect, type FormEvent } from 'react';
import {
  Home,
  Shield,
  Plus,
  Trash2,
  LogOut,
  Edit,
  Save,
  X,
  Upload,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  BarChart3,
  Building2,
  Users,
  FileText,
  Download,
  AlertCircle,
  Eye,
  User,
  Loader,
} from 'lucide-react';

interface Property {
  id: number;
  title: string;
  address: string;
  is_bachelor: boolean;
  available_flats: number;
  total_flats: number;
  space_per_student: number;
  campus_intake: string;
  image_urls: string[];
}

interface Application {
  id: number;
  student_name: string;
  student_email: string;
  student_phone?: string;
  student_number?: string;
  property_id: number;
  property_title: string;
  property_address?: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  notes?: string;
  proof_of_registration?: string;
  id_copy?: string;
  funding_approved?: boolean;
}

interface Stats {
  total_properties: number;
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  occupancy_rate: number;
}

interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ConfirmDialog {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  type: 'danger' | 'warning' | 'info';
}

const CAMPUSES = [
  'Soshanguve South',
  'Soshanguve North',
  'Pretoria Campus (Main)',
  'Arcadia Campus',
  'Arts Campus',
  'Garankuwa Campus',
];

export default function AdminDashboard() {
  const token = localStorage.getItem('access_token');
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  if (!token || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Shield className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">This page is for administrators only.</p>
          <a href="/" className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition">
            <Home className="w-5 h-5" /> Back to Home
          </a>
        </div>
      </div>
    );
  }

  const [properties, setProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'applications' | 'analytics'>('properties');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewingDocs, setViewingDocs] = useState<Application | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedPropertyForAnalytics, setSelectedPropertyForAnalytics] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info',
  });
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);

  const [addForm, setAddForm] = useState({
    title: '',
    address: '',
    is_bachelor: false,
    available_flats: '',
    space_per_student: '',
    campus_intake: [] as string[],
    images: [] as File[],
  });

  const [editForm, setEditForm] = useState({
    title: '',
    address: '',
    is_bachelor: false,
    available_flats: '',
    space_per_student: '',
    campus_intake: [] as string[],
    newImages: [] as File[],
    removedImages: [] as string[],
  });

const API = 'https://campusstay-h3qu.onrender.com/admin';

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmDialog({ show: true, title, message, onConfirm, type });
  };

  const fetchWithAuth = async (input: string, init?: RequestInit) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!(init?.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(input, { ...init, headers });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [propRes, appRes, statsRes] = await Promise.all([
        fetchWithAuth(`${API}/properties`),
        fetchWithAuth(`${API}/applications`),
        fetchWithAuth(`${API}/stats`),
      ]);
      if (propRes.ok) setProperties(await propRes.json());
      if (appRes.ok) setApplications(await appRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      showNotification('error', 'Failed to load data');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const loadApplicationDetails = async (appId: number) => {
    setLoadingDocs(true);
    try {
      const res = await fetchWithAuth(`${API}/applications/${appId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingDocs(data);
      } else {
        showNotification('error', 'Failed to load application details');
      }
    } catch (err) {
      showNotification('error', 'Network error loading documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleApplicationStatus = async (appId: number, status: 'approved' | 'rejected') => {
    showConfirm(
      `${status === 'approved' ? 'Approve' : 'Reject'} Application`,
      `Are you sure you want to ${status} this application? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetchWithAuth(`${API}/applications/${appId}/${status}`, { method: 'POST' });
          if (res.ok) {
            showNotification('success', `Application ${status} successfully!`);
            loadData();
            setViewingDocs(null);
          } else {
            const err = await res.json();
            showNotification('error', err.detail || 'Failed to update application');
          }
        } catch (err) {
          showNotification('error', 'Network error. Please try again.');
        }
      },
      status === 'rejected' ? 'danger' : 'warning'
    );
  };

  const deleteApplication = async (appId: number) => {
    showConfirm(
      'Delete Application',
      'Are you sure you want to permanently delete this handled application?',
      async () => {
        try {
          const res = await fetchWithAuth(`${API}/applications/${appId}`, { method: 'DELETE' });
          if (res.ok) {
            showNotification('success', 'Application deleted successfully');
            loadData();
          } else {
            const err = await res.json();
            showNotification('error', err.detail || 'Failed to delete application');
          }
        } catch (err) {
          showNotification('error', 'Network error. Please try again.');
        }
      },
      'danger'
    );
  };

  const deleteProperty = async (id: number) => {
    showConfirm(
      'Delete Property',
      'Are you sure you want to delete this property permanently? This action cannot be undone and will affect all related applications.',
      async () => {
        try {
          const res = await fetchWithAuth(`${API}/properties/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showNotification('success', 'Property deleted successfully');
            loadData();
          } else {
            showNotification('error', 'Failed to delete property');
          }
        } catch (err) {
          showNotification('error', 'Network error. Please try again.');
        }
      },
      'danger'
    );
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="w-4 h-4" /> },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-4 h-4" /> },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-4 h-4" /> },
    };
    const c = config[status];
    return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-xs border-2 ${c.color}`}>{c.icon} {status.toUpperCase()}</span>;
  };

  const handleAddProperty = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (addForm.campus_intake.length === 0) {
      showNotification('error', 'Please select at least one campus');
      return;
    }
    
    if (addForm.campus_intake.length > 3) {
      showNotification('error', 'Maximum 3 campuses allowed');
      return;
    }

    const formData = new FormData();
    formData.append('title', addForm.title);
    formData.append('address', addForm.address);
    formData.append('is_bachelor', String(addForm.is_bachelor));
    formData.append('available_flats', addForm.available_flats);
    formData.append('space_per_student', addForm.space_per_student);
    formData.append('campus_intake', addForm.campus_intake.join(', '));
    addForm.images.forEach(img => formData.append('images', img));

    try {
      const res = await fetchWithAuth(`${API}/properties`, { method: 'POST', body: formData });
      if (res.ok) {
        showNotification('success', 'Property added successfully!');
        setShowAddForm(false);
        setAddForm({ title: '', address: '', is_bachelor: false, available_flats: '', space_per_student: '', campus_intake: [], images: [] });
        loadData();
      } else {
        const err = await res.json();
        showNotification('error', err.detail || 'Failed to add property');
      }
    } catch (err) {
      showNotification('error', 'Network error. Please try again.');
    }
  };

  const openEdit = (p: Property) => {
    setEditingProperty(p);
    setEditForm({
      title: p.title,
      address: p.address,
      is_bachelor: p.is_bachelor,
      available_flats: String(p.available_flats),
      space_per_student: String(p.space_per_student),
      campus_intake: p.campus_intake.split(', ').filter(Boolean),
      newImages: [],
      removedImages: [],
    });
  };

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProperty) return;

    if (editForm.campus_intake.length === 0) {
      showNotification('error', 'Please select at least one campus');
      return;
    }
    
    if (editForm.campus_intake.length > 3) {
      showNotification('error', 'Maximum 3 campuses allowed');
      return;
    }

    const formData = new FormData();
    formData.append('title', editForm.title);
    formData.append('address', editForm.address);
    formData.append('is_bachelor', String(editForm.is_bachelor));
    formData.append('available_flats', editForm.available_flats);
    formData.append('space_per_student', editForm.space_per_student);
    formData.append('campus_intake', editForm.campus_intake.join(', '));
    editForm.newImages.forEach(img => formData.append('new_images', img));
    editForm.removedImages.forEach(url => formData.append('remove_images', url));
    
    try {
      const res = await fetchWithAuth(`${API}/properties/${editingProperty.id}`, { method: 'PUT', body: formData });
      if (res.ok) {
        showNotification('success', 'Property updated successfully!');
        setEditingProperty(null);
        loadData();
      } else {
        const err = await res.json();
        showNotification('error', err.detail || 'Failed to update property');
      }
    } catch (err) {
      showNotification('error', 'Network error. Please try again.');
    }
  };

  const toggleCampus = (campus: string, formType: 'add' | 'edit') => {
    if (formType === 'add') {
      const current = addForm.campus_intake;
      if (current.includes(campus)) {
        setAddForm({ ...addForm, campus_intake: current.filter(c => c !== campus) });
      } else if (current.length < 3) {
        setAddForm({ ...addForm, campus_intake: [...current, campus] });
      } else {
        showNotification('warning', 'Maximum 3 campuses allowed');
      }
    } else {
      const current = editForm.campus_intake;
      if (current.includes(campus)) {
        setEditForm({ ...editForm, campus_intake: current.filter(c => c !== campus) });
      } else if (current.length < 3) {
        setEditForm({ ...editForm, campus_intake: [...current, campus] });
      } else {
        showNotification('warning', 'Maximum 3 campuses allowed');
      }
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const handledApplications = applications.filter(app => app.status !== 'pending');

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch(type) {
      case 'success': return 'bg-green-50 border-green-500 text-green-800';
      case 'error': return 'bg-red-50 border-red-500 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-500 text-yellow-800';
      default: return 'bg-blue-50 border-blue-500 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2" style={{ maxWidth: '400px' }}>
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg animate-slide-in ${getNotificationColor(notif.type)}`}
          >
            {getNotificationIcon(notif.type)}
            <p className="flex-1 font-medium">{notif.message}</p>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className={`px-6 py-4 border-b ${confirmDialog.type === 'danger' ? 'bg-red-50 border-red-200' : confirmDialog.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
              <h3 className="text-lg font-bold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">{confirmDialog.message}</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end rounded-b-xl">
              <button onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition">
                Cancel
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, show: false }); }}
                className={`px-4 py-2 rounded-lg font-medium transition ${confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : confirmDialog.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user.full_name || 'Admin'}</p>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Properties', value: stats.total_properties, color: 'blue', icon: <Building2 className="w-5 h-5" /> },
              { label: 'Applications', value: stats.total_applications, color: 'purple', icon: <Users className="w-5 h-5" /> },
              { label: 'Pending', value: stats.pending_applications, color: 'yellow', icon: <Clock className="w-5 h-5" /> },
              { label: 'Approved', value: stats.approved_applications, color: 'green', icon: <CheckCircle className="w-5 h-5" /> },
              { label: 'Occupancy', value: `${stats.occupancy_rate}%`, color: 'orange', icon: <BarChart3 className="w-5 h-5" /> },
            ].map((s, i) => (
              <div key={i} className={`bg-white rounded-lg shadow-sm p-4 border-l-4 border-${s.color}-500`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 font-medium">{s.label}</p>
                  <div className={`text-${s.color}-500`}>{s.icon}</div>
                </div>
                <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-1 flex gap-1">
          {['properties', 'applications', 'analytics'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition ${activeTab === tab ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition shadow-sm">
              <Plus className="w-5 h-5" /> Add Property
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(p => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                {p.image_urls && p.image_urls.length > 0 ? (
                  <div className="h-48 overflow-hidden bg-gray-200">
                    <img 
                      src={p.image_urls[0]} 
                      alt={p.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f97316" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle"%3E🏠%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 h-48 flex items-center justify-center">
                    <Home className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-600 flex items-center mb-3">
                    <MapPin className="w-4 h-4 mr-1.5 text-orange-600" />
                    {p.address}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-semibold">Campuses:</span> {p.campus_intake}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    <span className="font-semibold">{p.is_bachelor ? 'Students Per Unit' : 'Students Per Room'}:</span> {p.space_per_student}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span className="text-gray-600">Available</span>
                      <span className="text-orange-600">{p.available_flats} / {p.total_flats}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${p.available_flats > 0 ? 'bg-green-500' : 'bg-gray-400'}`} style={{ width: `${(p.available_flats / p.total_flats) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => deleteProperty(p.id)} className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications Tab - Compact View with Expand */}
      {activeTab === 'applications' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Applications</h2>
          {loading ? (
            <div className="text-center py-20 text-gray-600">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
              Loading applications...
            </div>
          ) : pendingApplications.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-sm">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map(app => (
                <div key={app.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
                  {/* Compact Summary */}
                  <div 
                    className="p-5 cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <User className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-bold text-gray-900">{app.student_name}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-gray-600 ml-8">Applied for: <span className="font-semibold text-orange-600">{app.property_title}</span></p>
                      <p className="text-xs text-gray-500 ml-8 mt-1">
                        {new Date(app.applied_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadApplicationDetails(app.id);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-1.5 text-sm"
                      >
                        <FileText className="w-4 h-4" /> View Docs
                      </button>
                      <Eye className={`w-5 h-5 text-gray-400 transition-transform ${expandedAppId === app.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAppId === app.id && (
                    <div className="border-t border-gray-200 bg-gray-50 p-5 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Contact Information</h4>
                          <div className="space-y-1.5 text-sm text-gray-700">
                            <p className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-orange-600" /> {app.student_email}
                            </p>
                            {app.student_phone && (
                              <p className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-orange-600" /> {app.student_phone}
                              </p>
                            )}
                            {app.student_number && (
                              <p className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-orange-600" /> {app.student_number}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Application Details</h4>
                          {app.funding_approved !== undefined && (
                            <div className="mb-2">
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${app.funding_approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                Funding: {app.funding_approved ? '✓ Approved' : '✗ Not Approved'}
                              </span>
                            </div>
                          )}
                          {app.notes && (
                            <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                              <span className="font-semibold">Notes:</span> {app.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleApplicationStatus(app.id, 'approved')} 
                          className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button 
                          onClick={() => handleApplicationStatus(app.id, 'rejected')} 
                          className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab - Only Handled Applications */}
      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Application History & Analytics</h2>
          
          {/* Property Selector */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Property to Analyze</label>
            <select
              value={selectedPropertyForAnalytics || ''}
              onChange={(e) => setSelectedPropertyForAnalytics(Number(e.target.value) || null)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
            >
              <option value="">-- Select a property --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.address})</option>
              ))}
            </select>
          </div>

          {!selectedPropertyForAnalytics ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Select a property above to view its application history</p>
            </div>
          ) : (
            <>
              {(() => {
                const propertyApps = handledApplications.filter(app => app.property_id === selectedPropertyForAnalytics);
                const approved = propertyApps.filter(app => app.status === 'approved').length;
                const rejected = propertyApps.filter(app => app.status === 'rejected').length;
                
                return (
                  <>
                    {/* Property-specific stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-green-500">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600 font-medium">Approved</p>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-green-600">{approved}</p>
                      </div>
                      <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600 font-medium">Rejected</p>
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold text-red-600">{rejected}</p>
                      </div>
                      <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600 font-medium">Total Handled</p>
                          <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{propertyApps.length}</p>
                      </div>
                    </div>

                    {/* Application History */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Handled Applications for This Property</h3>
                      {propertyApps.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">No handled applications for this property yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {propertyApps.map(app => (
                            <div key={app.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-lg font-bold text-gray-900">{app.student_name}</h4>
                                    {getStatusBadge(app.status)}
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-orange-600" /> {app.student_email}</p>
                                    {app.student_phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-600" /> {app.student_phone}</p>}
                                    {app.student_number && <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-orange-600" /> {app.student_number}</p>}
                                    {app.funding_approved !== undefined && (
                                      <div className="mt-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${app.funding_approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                          Funding: {app.funding_approved ? '✓ Approved' : '✗ Not Approved'}
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                      Applied on {new Date(app.applied_at).toLocaleDateString('en-ZA', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button 
                                    onClick={() => loadApplicationDetails(app.id)} 
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1.5 text-sm"
                                  >
                                    <FileText className="w-4 h-4" /> View Documents
                                  </button>
                                  <button 
                                    onClick={() => deleteApplication(app.id)} 
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-1.5 text-sm"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ADD PROPERTY MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddProperty} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
                <input
                  type="text"
                  placeholder="e.g., Student Haven Apartments"
                  value={addForm.title}
                  onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g., 123 Main Street, Johannesburg"
                  value={addForm.address}
                  onChange={e => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campus Intake (Select up to 3)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPUSES.map(campus => (
                    <div
                      key={campus}
                      onClick={() => toggleCampus(campus, 'add')}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                        addForm.campus_intake.includes(campus)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          addForm.campus_intake.includes(campus)
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-400'
                        }`}>
                          {addForm.campus_intake.includes(campus) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{campus}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {addForm.campus_intake.length} / 3
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_bachelor"
                  checked={addForm.is_bachelor}
                  onChange={e => setAddForm({ ...addForm, is_bachelor: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="is_bachelor" className="text-sm font-medium text-gray-700">Bachelor Flats</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Flats</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={addForm.available_flats}
                    onChange={e => setAddForm({ ...addForm, available_flats: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {addForm.is_bachelor ? 'Students Per Unit' : 'Students Per Room'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="2"
                    value={addForm.space_per_student}
                    onChange={e => setAddForm({ ...addForm, space_per_student: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Upload className="inline w-4 h-4 mr-1" /> Property Images (1-5 required)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (addForm.images.length + files.length > 5) {
                      showNotification('warning', 'Maximum 5 images allowed');
                      return;
                    }
                    setAddForm({ ...addForm, images: [...addForm.images, ...files] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {addForm.images.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setAddForm({ ...addForm, images: addForm.images.filter((_, idx) => idx !== i) })}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={addForm.images.length === 0}
                  className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg font-medium hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" /> Add Property
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROPERTY MODAL */}
      {editingProperty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Property #{editingProperty.id}</h2>
              <button onClick={() => setEditingProperty(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
                <input
                  type="text"
                  placeholder="Property Title"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Address"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campus Intake (Select up to 3)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPUSES.map(campus => (
                    <div
                      key={campus}
                      onClick={() => toggleCampus(campus, 'edit')}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                        editForm.campus_intake.includes(campus)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          editForm.campus_intake.includes(campus)
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-400'
                        }`}>
                          {editForm.campus_intake.includes(campus) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{campus}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {editForm.campus_intake.length} / 3
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_bachelor"
                  checked={editForm.is_bachelor}
                  onChange={e => setEditForm({ ...editForm, is_bachelor: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="edit_is_bachelor" className="text-sm font-medium text-gray-700">Bachelor Flats</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Flats</label>
                  <input
                    type="number"
                    placeholder="Available Flats"
                    value={editForm.available_flats}
                    onChange={e => setEditForm({ ...editForm, available_flats: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editForm.is_bachelor ? 'Students Per Unit' : 'Students Per Room'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="2"
                    value={editForm.space_per_student}
                    onChange={e => setEditForm({ ...editForm, space_per_student: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Images</label>
                <div className="flex flex-wrap gap-2">
                  {editingProperty.image_urls
                    .filter(url => !editForm.removedImages.includes(url))
                    .map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, removedImages: [...editForm.removedImages, url] })}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Upload className="inline w-4 h-4 mr-1" /> Add New Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const totalImages =
                      editingProperty.image_urls.length -
                      editForm.removedImages.length +
                      editForm.newImages.length +
                      files.length;
                    if (totalImages > 5) {
                      showNotification('warning', 'Maximum 5 images allowed');
                      return;
                    }
                    setEditForm({ ...editForm, newImages: [...editForm.newImages, ...files] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {editForm.newImages.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, newImages: editForm.newImages.filter((_, idx) => idx !== i) })}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> Update Property
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOCUMENTS MODAL */}
      {viewingDocs && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Documents</h2>
                <p className="text-sm text-gray-600 mt-1">{viewingDocs.student_name} - {viewingDocs.property_title}</p>
              </div>
              <button onClick={() => setViewingDocs(null)} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingDocs ? (
              <div className="p-12 text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
                <p className="text-gray-600">Loading documents...</p>
              </div>
            ) : (
              <div className="p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
                {/* Student Info */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 mb-6 border-2 border-orange-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3">Student Information</h3>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold">Name:</span> {viewingDocs.student_name}
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold">Email:</span> {viewingDocs.student_email}
                        </p>
                        {viewingDocs.student_phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold">Phone:</span> {viewingDocs.student_phone}
                          </p>
                        )}
                        {viewingDocs.student_number && (
                          <p className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold">Student #:</span> {viewingDocs.student_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3">Application Details</h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold">Property:</span> {viewingDocs.property_title}
                        </p>
                        {viewingDocs.property_address && (
                          <p className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-orange-600 mt-0.5" />
                            {viewingDocs.property_address}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Status:</span> {getStatusBadge(viewingDocs.status)}
                        </p>
                        <p>
                          <span className="font-semibold">Applied:</span>{' '}
                          {new Date(viewingDocs.applied_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {viewingDocs.funding_approved !== undefined && (
                          <div className="mt-2">
                            <span
                              className={`inline-block text-xs font-semibold px-3 py-1 rounded ${
                                viewingDocs.funding_approved
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Funding: {viewingDocs.funding_approved ? '✓ Approved' : '✗ Not Approved'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {viewingDocs.notes && (
                    <div className="mt-4 pt-4 border-t border-orange-200">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Notes:</span>{' '}
                        <span className="text-gray-600">{viewingDocs.notes}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="space-y-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-orange-600" /> Supporting Documents
                  </h3>

                  {/* Proof of Registration */}
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-4 border-b-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">Proof of Registration</h4>
                          <p className="text-sm text-gray-600">Student registration confirmation document</p>
                        </div>
                        {viewingDocs.proof_of_registration && (
                          <a
                            href={viewingDocs.proof_of_registration}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 flex items-center gap-1.5 text-sm font-semibold bg-white px-4 py-2 rounded-lg shadow-sm transition"
                          >
                            <Download className="w-4 h-4" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="p-5 bg-gray-50">
                      {viewingDocs.proof_of_registration ? (
                        <div className="bg-white rounded-lg p-2 shadow-sm">
                          <iframe
                            src={`${viewingDocs.proof_of_registration}#toolbar=0`}
                            className="w-full h-96 rounded-lg border border-gray-200"
                            title="Proof of Registration"
                          />
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No proof of registration uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ID Copy */}
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 px-5 py-4 border-b-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">ID Copy</h4>
                          <p className="text-sm text-gray-600">Student identification document</p>
                        </div>
                        {viewingDocs.id_copy && (
                          <a
                            href={viewingDocs.id_copy}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 flex items-center gap-1.5 text-sm font-semibold bg-white px-4 py-2 rounded-lg shadow-sm transition"
                          >
                            <Download className="w-4 h-4" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="p-5 bg-gray-50">
                      {viewingDocs.id_copy ? (
                        <div className="bg-white rounded-lg p-2 shadow-sm">
                          <iframe
                            src={`${viewingDocs.id_copy}#toolbar=0`}
                            className="w-full h-96 rounded-lg border border-gray-200"
                            title="ID Copy"
                          />
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No ID copy uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t-2 border-gray-200">
                  {viewingDocs.status === 'pending' ? (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApplicationStatus(viewingDocs.id, 'approved')}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2 shadow-lg text-lg"
                      >
                        <CheckCircle className="w-6 h-6" /> Approve Application
                      </button>
                      <button
                        onClick={() => handleApplicationStatus(viewingDocs.id, 'rejected')}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition flex items-center justify-center gap-2 shadow-lg text-lg"
                      >
                        <XCircle className="w-6 h-6" /> Reject Application
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setViewingDocs(null)}
                      className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition text-lg"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}