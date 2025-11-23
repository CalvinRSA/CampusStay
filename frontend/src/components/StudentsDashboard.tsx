import { useState, useEffect, type FormEvent } from 'react';
import {
  Home,
  Search,
  Heart,
  MapPin,
  Building2,
  Users,
  LogOut,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Menu,
  Edit,
  Save,
  Upload,
  File,
  AlertCircle,
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
  property_id: number;
  property_title: string;
  property_address: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  notes?: string;
  proof_of_registration?: string;
  id_copy?: string;
  funding_approved?: boolean;
}

interface StudentProfile {
  full_name: string;
  email: string;
  phone_number: string;
  student_number: string;
  campus: string;
}

interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const CAMPUSES = [
  'Soshanguve South',
  'Soshanguve North',
  'Pretoria Campus (Main)',
  'Arcadia Campus',
  'Arts Campus',
  'Garankuwa Campus',
];

export default function StudentsDashboard() {
  const token = localStorage.getItem('access_token');
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  // Redirect if not student
  if (!token || !user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <User className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">This page is for students only.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
          >
            <Home className="w-5 h-5" /> Back to Home
          </a>
        </div>
      </div>
    );
  }

  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'favorites' | 'applications' | 'profile'>('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [applicationNotes, setApplicationNotes] = useState('');
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    searchQuery: '',
    propertyType: 'all' as 'all' | 'bachelor' | 'shared',
    campusIntake: [] as string[],
    minSpace: '',
    maxSpace: '',
    availableOnly: true,
  });

  const [editAppForm, setEditAppForm] = useState({
    por: null as File | null,
    idCopy: null as File | null,
    fundingApproved: false,
  });

  const [editProfileForm, setEditProfileForm] = useState({
    phone_number: '',
    student_number: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const API = 'https://campusstay-h3qu.onrender.com';

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const fetchWithAuth = async (input: string, init?: RequestInit) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!(init?.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(input, { ...init, headers });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [propsRes, appsRes, profRes] = await Promise.all([
        fetchWithAuth(`${API}/properties`),
        fetchWithAuth(`${API}/applications/my-applications`),
        fetchWithAuth(`${API}/auth/me`),
      ]);

      if (propsRes.ok) {
        const props = await propsRes.json();
        setProperties(props);
        setFilteredProperties(props);
      }
      if (appsRes.ok) setApplications(await appsRes.json());
      if (profRes.ok) {
        const prof = await profRes.json();
        setProfile(prof);
        setEditProfileForm({
          phone_number: prof.phone_number || '',
          student_number: prof.student_number || '',
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // Apply filters
  useEffect(() => {
    let list = [...properties];

    // Search query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
      );
    }

    // Property type
    if (filters.propertyType !== 'all') {
      list = list.filter((p) =>
        filters.propertyType === 'bachelor' ? p.is_bachelor : !p.is_bachelor
      );
    }

    // Campus intake
    if (filters.campusIntake.length > 0) {
      list = list.filter((p) => {
        const campuses = p.campus_intake.split(', ').map((c) => c.trim());
        return filters.campusIntake.some((fc) => campuses.includes(fc));
      });
    }

    // Space per student
    if (filters.minSpace) list = list.filter((p) => p.space_per_student >= +filters.minSpace);
    if (filters.maxSpace) list = list.filter((p) => p.space_per_student <= +filters.maxSpace);

    // Available only
    if (filters.availableOnly) list = list.filter((p) => p.available_flats > 0);

    setFilteredProperties(list);
  }, [filters, properties]);

  const toggleFavorite = (id: number) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const toggleCampusFilter = (campus: string) => {
    const current = filters.campusIntake;
    if (current.includes(campus)) {
      setFilters({ ...filters, campusIntake: current.filter((c) => c !== campus) });
    } else {
      setFilters({ ...filters, campusIntake: [...current, campus] });
    }
  };

  const handleApply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API}/applications/my-applications`, {
        method: 'POST',
        body: JSON.stringify({ property_id: selectedProperty.id, notes: applicationNotes }),
      });
      if (res.ok) {
        showNotification('success', 'Application submitted successfully!');
        setShowApplyModal(false);
        setSelectedProperty(null);
        setApplicationNotes('');
        loadData();
      } else {
        const err = await res.json();
        showNotification('error', err.detail || 'Failed to submit application');
      }
    } catch (err: any) {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditApplication = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingApplication) return;

    const formData = new FormData();
    if (editAppForm.por) formData.append('proof_of_registration', editAppForm.por);
    if (editAppForm.idCopy) formData.append('id_copy', editAppForm.idCopy);
    formData.append('funding_approved', String(editAppForm.fundingApproved));

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API}/applications/my-applications/${editingApplication.id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (res.ok) {
        showNotification('success', 'Application updated successfully!');
        setEditingApplication(null);
        setEditAppForm({ por: null, idCopy: null, fundingApproved: false });
        loadData();
      } else {
        const err = await res.json();
        showNotification('error', err.detail || 'Failed to update application');
      }
    } catch (err) {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      editProfileForm.new_password &&
      editProfileForm.new_password !== editProfileForm.confirm_password
    ) {
      showNotification('error', 'New passwords do not match!');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        phone_number: editProfileForm.phone_number,
        student_number: editProfileForm.student_number,
      };

      if (editProfileForm.new_password) {
        payload.current_password = editProfileForm.current_password;
        payload.new_password = editProfileForm.new_password;
      }

      const res = await fetchWithAuth(`${API}/auth/update-profile`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotification('success', 'Profile updated successfully!');
        setEditingProfile(false);
        setEditProfileForm({
          ...editProfileForm,
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        loadData();
      } else {
        const err = await res.json();
        showNotification('error', err.detail || 'Failed to update profile');
      }
    } catch (err: any) {
      showNotification('error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="w-4 h-4" />,
      },
      approved: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      rejected: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="w-4 h-4" />,
      },
    };
    const c = config[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-xs border-2 ${c.color}`}
      >
        {c.icon} {status.toUpperCase()}
      </span>
    );
  };

  const openPropertyDetails = (property: Property) => {
    setSelectedProperty(property);
    setCurrentImageIndex(0);
    setShowApplyModal(false);
  };

  const openEditApplication = (app: Application) => {
    setEditingApplication(app);
    setEditAppForm({
      por: null,
      idCopy: null,
      fundingApproved: app.funding_approved || false,
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-500 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-500 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-500 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2" style={{ maxWidth: '400px' }}>
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg animate-slide-in ${getNotificationColor(
              notif.type
            )}`}
          >
            {getNotificationIcon(notif.type)}
            <p className="flex-1 font-medium">{notif.message}</p>
            <button
              onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CampusStay</h1>
                <p className="text-sm text-gray-600">Student Portal</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              {['browse', 'favorites', 'applications', 'profile'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition capitalize ${
                    activeTab === tab
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'browse' && <Search className="w-4 h-4 inline mr-2" />}
                  {tab === 'favorites' && <Heart className="w-4 h-4 inline mr-2" />}
                  {tab === 'applications' && <FileText className="w-4 h-4 inline mr-2" />}
                  {tab === 'profile' && <User className="w-4 h-4 inline mr-2" />}
                  {tab}
                  {tab === 'favorites' && favorites.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                      {favorites.length}
                    </span>
                  )}
                  {tab === 'applications' &&
                    applications.filter((a) => a.status === 'pending').length > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                        {applications.filter((a) => a.status === 'pending').length}
                      </span>
                    )}
                </button>
              ))}
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden text-gray-700"
            >
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenu && (
            <div className="md:hidden mt-4 space-y-2">
              {['browse', 'favorites', 'applications', 'profile'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    setMobileMenu(false);
                  }}
                  className={`block w-full text-left px-4 py-2 rounded-lg font-medium transition capitalize ${
                    activeTab === tab
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
              <button
                onClick={logout}
                className="block w-full text-left px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* BROWSE TAB */}
        {activeTab === 'browse' && (
          <div>
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by title or location..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-medium"
                >
                  <Filter className="w-5 h-5" />
                  <span>Filters</span>
                  {(filters.propertyType !== 'all' ||
                    filters.campusIntake.length > 0 ||
                    filters.minSpace ||
                    filters.maxSpace) && (
                    <span className="ml-1 bg-white text-orange-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      !
                    </span>
                  )}
                </button>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type
                    </label>
                    <select
                      value={filters.propertyType}
                      onChange={(e) =>
                        setFilters({ ...filters, propertyType: e.target.value as any })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="bachelor">Bachelor Flat</option>
                      <option value="shared">Commune House (Shared)</option>
                    </select>
                  </div>

                  {/* Campus Intake */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campus Intake (Select multiple)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CAMPUSES.map((campus) => (
                        <div
                          key={campus}
                          onClick={() => toggleCampusFilter(campus)}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                            filters.campusIntake.includes(campus)
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-300 hover:border-gray-400 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                filters.campusIntake.includes(campus)
                                  ? 'border-orange-500 bg-orange-500'
                                  : 'border-gray-400'
                              }`}
                            >
                              {filters.campusIntake.includes(campus) && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium">{campus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Space Range */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Students Per Unit
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1"
                        value={filters.minSpace}
                        onChange={(e) => setFilters({ ...filters, minSpace: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Students Per Unit
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 4"
                        value={filters.maxSpace}
                        onChange={(e) => setFilters({ ...filters, maxSpace: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Available Only */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="availableOnly"
                      checked={filters.availableOnly}
                      onChange={(e) =>
                        setFilters({ ...filters, availableOnly: e.target.checked })
                      }
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="availableOnly" className="text-sm font-medium text-gray-700">
                      Show only available properties
                    </label>
                  </div>

                  {/* Clear Filters */}
                  <button
                    onClick={() =>
                      setFilters({
                        searchQuery: '',
                        propertyType: 'all',
                        campusIntake: [],
                        minSpace: '',
                        maxSpace: '',
                        availableOnly: true,
                      })
                    }
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Properties Grid */}
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredProperties.length} Properties Available
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-20 text-gray-600">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
                Loading properties...
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Properties Found</h3>
                <p className="text-gray-600">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer relative group"
                  >
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(property.id);
                      }}
                      className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          favorites.includes(property.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>

                    <div onClick={() => openPropertyDetails(property)}>
                      {property.image_urls && property.image_urls.length > 0 ? (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={property.image_urls[0]}
                            alt={property.title}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f97316" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle"%3E🏠%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          {property.available_flats === 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">FULLY BOOKED</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 h-48 flex items-center justify-center">
                          <Home className="w-16 h-16 text-white opacity-50" />
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg text-gray-900 flex-1">
                            {property.title}
                          </h3>
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              property.is_bachelor
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {property.is_bachelor ? 'Bachelor' : 'Shared'}
                          </span>
                        </div>

                        <div className="flex items-center text-gray-600 text-sm mb-3">
                          <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                          <span className="line-clamp-1">{property.address}</span>
                        </div>

                        <div className="text-xs text-gray-600 mb-3">
                          <span className="font-semibold">Campuses:</span> {property.campus_intake}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="flex justify-between text-sm font-semibold mb-2">
                            <span className="text-gray-600">Available</span>
                            <span className="text-orange-600">
                              {property.available_flats} / {property.total_flats}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                property.available_flats > 0 ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                              style={{
                                width: `${
                                  (property.available_flats / property.total_flats) * 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-2 text-orange-600" />
                          <span>
                            {property.space_per_student}{' '}
                            {property.is_bachelor ? 'students per unit' : 'students per room'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Favorite Properties</h2>
            {favorites.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Favorites Yet</h3>
                <p className="text-gray-600 mb-6">Start exploring and save properties you like!</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-medium"
                >
                  Browse Properties
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties
                  .filter((p) => favorites.includes(p.id))
                  .map((property) => (
                    <div
                      key={property.id}
                      className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer relative"
                      onClick={() => openPropertyDetails(property)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(property.id);
                        }}
                        className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg"
                      >
                        <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                      </button>

                      {property.image_urls && property.image_urls.length > 0 ? (
                        <img
                          src={property.image_urls[0]}
                          alt={property.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f97316" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle"%3E🏠%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 h-48 flex items-center justify-center">
                          <Home className="w-16 h-16 text-white opacity-50" />
                        </div>
                      )}

                      <div className="p-5">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{property.title}</h3>
                        <div className="flex items-center text-gray-600 text-sm mb-2">
                          <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                          <span>{property.address}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Campuses:</span> {property.campus_intake}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Applications</h2>
            {loading ? (
              <div className="text-center py-20 text-gray-600">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 mb-6">
                  Start applying to properties and track them here!
                </p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-medium"
                >
                  Browse Properties
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {app.property_title || 'Unknown Property'}
                          </h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-gray-600 flex items-center mb-3">
                          <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                          {app.property_address || 'Address not available'}
                        </p>
                        {app.notes && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">Notes:</span> {app.notes}
                            </p>
                          </div>
                        )}
                        {app.proof_of_registration && (
                          <div className="mt-2">
                            <a
                              href={app.proof_of_registration}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                              <File className="w-4 h-4" /> View Proof of Registration
                            </a>
                          </div>
                        )}
                        {app.id_copy && (
                          <div className="mt-2">
                            <a
                              href={app.id_copy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                              <File className="w-4 h-4" /> View ID Copy
                            </a>
                          </div>
                        )}
                        {app.funding_approved !== undefined && (
                          <div className="mt-2">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                app.funding_approved
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Funding: {app.funding_approved ? '✓ Approved' : '✗ Not Approved'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col gap-3">
                        <p className="text-sm text-gray-500 flex items-center justify-end">
                          <Clock className="w-4 h-4 mr-1" />
                          Applied on{' '}
                          {new Date(app.applied_at).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        {app.status === 'pending' && (
                          <button
                            onClick={() => openEditApplication(app)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 text-sm"
                          >
                            <Edit className="w-4 h-4" /> Edit Application
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && profile && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
                    <p className="text-gray-600">TUT Student</p>
                  </div>
                </div>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit Profile
                  </button>
                )}
              </div>

              {!editingProfile ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-700">
                      <Mail className="w-5 h-5 mr-3 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-700">
                      <Phone className="w-5 h-5 mr-3 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{profile.phone_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-700">
                      <FileText className="w-5 h-5 mr-3 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Student Number</p>
                        <p className="font-medium">{profile.student_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-700">
                      <Building2 className="w-5 h-5 mr-3 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Campus</p>
                        <p className="font-medium">{profile.campus}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editProfileForm.phone_number}
                      onChange={(e) =>
                        setEditProfileForm({ ...editProfileForm, phone_number: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Number
                    </label>
                    <input
                      type="text"
                      value={editProfileForm.student_number}
                      onChange={(e) =>
                        setEditProfileForm({ ...editProfileForm, student_number: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Change Password (Optional)
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={editProfileForm.current_password}
                          onChange={(e) =>
                            setEditProfileForm({
                              ...editProfileForm,
                              current_password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          placeholder="Leave blank to keep current password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={editProfileForm.new_password}
                          onChange={(e) =>
                            setEditProfileForm({
                              ...editProfileForm,
                              new_password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          placeholder="Enter new password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={editProfileForm.confirm_password}
                          onChange={(e) =>
                            setEditProfileForm({
                              ...editProfileForm,
                              confirm_password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" /> {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(false);
                        setEditProfileForm({
                          phone_number: profile.phone_number || '',
                          student_number: profile.student_number || '',
                          current_password: '',
                          new_password: '',
                          confirm_password: '',
                        });
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Account Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{favorites.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Favorites</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{applications.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Applications</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                      {applications.filter((a) => a.status === 'pending').length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl my-8">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center z-10 rounded-t-2xl">
              <h3 className="text-2xl font-bold text-gray-900">{selectedProperty.title}</h3>
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-8">
              {selectedProperty.image_urls && selectedProperty.image_urls.length > 0 ? (
                <div className="relative mb-8 rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={selectedProperty.image_urls[currentImageIndex]}
                    alt={selectedProperty.title}
                    className="w-full h-96 object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f97316" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle"%3E🏠%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {selectedProperty.image_urls.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((i) =>
                            i === 0 ? selectedProperty.image_urls.length - 1 : i - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((i) =>
                            i === selectedProperty.image_urls.length - 1 ? 0 : i + 1
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {selectedProperty.image_urls.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full ${
                              idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-orange-500 to-red-600 h-96 rounded-xl flex items-center justify-center mb-8">
                  <Home className="w-32 h-32 text-white opacity-50" />
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-sm font-semibold px-4 py-2 rounded-full ${
                        selectedProperty.is_bachelor
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {selectedProperty.is_bachelor ? 'Bachelor Flat' : 'Commune House (Shared)'}
                    </span>
                    <button
                      onClick={() => toggleFavorite(selectedProperty.id)}
                      className="p-2 rounded-full hover:bg-gray-100 transition"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          favorites.includes(selectedProperty.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start text-gray-600 mb-4">
                    <MapPin className="w-5 h-5 mr-3 text-orange-600 mt-1 flex-shrink-0" />
                    <p className="text-lg">{selectedProperty.address}</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-gray-900 mb-2">Campus Intake</h4>
                    <p className="text-sm text-gray-700">{selectedProperty.campus_intake}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4">Availability</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Available Units</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedProperty.available_flats}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Units</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedProperty.total_flats}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        selectedProperty.available_flats > 0 ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      style={{
                        width: `${
                          (selectedProperty.available_flats / selectedProperty.total_flats) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {selectedProperty.is_bachelor ? 'Students Per Unit' : 'Students Per Room'}
                  </h4>
                  <div className="flex items-center">
                    <Users className="w-6 h-6 text-blue-600 mr-3" />
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedProperty.space_per_student}{' '}
                      {selectedProperty.is_bachelor ? 'per unit' : 'per room'}
                    </p>
                  </div>
                </div>

                {applications.some((app) => app.property_id === selectedProperty.id) ? (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-lg font-bold text-yellow-800">You've Already Applied</p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Check your applications tab for status updates
                    </p>
                  </div>
                ) : selectedProperty.available_flats === 0 ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                    <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                    <p className="text-lg font-bold text-red-800">Fully Booked</p>
                    <p className="text-sm text-red-700 mt-2">
                      This property has no available units at the moment
                    </p>
                  </div>
                ) : !showApplyModal ? (
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-xl transition flex items-center justify-center gap-3"
                  >
                    <Send className="w-6 h-6" />
                    <span>Apply Now</span>
                  </button>
                ) : (
                  <form onSubmit={handleApply} className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Application Form</h4>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={applicationNotes}
                        onChange={(e) => setApplicationNotes(e.target.value)}
                        placeholder="Tell us why you're interested in this property..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowApplyModal(false)}
                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {editingApplication && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-2xl font-bold text-gray-900">Edit Application</h3>
              <button
                onClick={() => setEditingApplication(null)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditApplication} className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">
                  {editingApplication.property_title}
                </h4>
                <p className="text-sm text-gray-600">{editingApplication.property_address}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Upload className="inline w-4 h-4 mr-1" /> Proof of Registration (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setEditAppForm({ ...editAppForm, por: e.target.files?.[0] || null })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                {editingApplication.proof_of_registration && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Current file uploaded
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Upload className="inline w-4 h-4 mr-1" /> ID Copy (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setEditAppForm({ ...editAppForm, idCopy: e.target.files?.[0] || null })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                {editingApplication.id_copy && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Current file uploaded
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
                <input
                  type="checkbox"
                  id="funding_approved"
                  checked={editAppForm.fundingApproved}
                  onChange={(e) =>
                    setEditAppForm({ ...editAppForm, fundingApproved: e.target.checked })
                  }
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="funding_approved" className="text-sm font-medium text-gray-700">
                  I have been approved for funding
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> {submitting ? 'Updating...' : 'Update Application'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingApplication(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
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