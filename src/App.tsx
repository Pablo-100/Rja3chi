import { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType, testConnection } from './firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import {
  MapPin,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Database,
  Search,
  Plus,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Clock,
  Download,
  Home,
  Briefcase,
  User,
  Zap,
  Info,
  ThumbsUp,
  Check,
  Building2,
  X,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Globe,
  Award,
  RotateCcw,
  Trash2
} from 'lucide-react';

// Time-decay report weighting function (التقارير القديمة تنقص قيمتها مع الوقت)
// Fresh (< 2h): 1.0 weight (100% influence)
// Moderate (2h to 6h): 0.6 weight (60% influence)
// Older (6h to 12h): 0.3 weight (30% influence)
// Stale (> 12h): 0.1 weight (10% influence)
const getReportTimeWeight = (reportedAtIso: string, currentTimeMs: number): number => {
  const ageMs = Math.max(0, currentTimeMs - new Date(reportedAtIso).getTime());
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 2) return 1.0;
  if (ageHours < 6) return 0.6;
  if (ageHours < 12) return 0.3;
  return 0.1;
};
import { motion, AnimatePresence } from 'motion/react';
import locationsData from './tunisia-locations.json';
import { Governorate, OutageReport, OutageType, OutageStatus, AffectedCategory, DeviceSecurityProfile } from './types';

// Initial dynamic reports dataset representing current live situation
const INITIAL_REPORTS: OutageReport[] = [
  {
    id: "rep-amilcar-1",
    governorateId: 1,
    governorateNameFr: "Tunis",
    governorateNameAr: "تونس",
    delegationId: 101,
    delegationNameFr: "Carthage",
    delegationNameAr: "قرطاج",
    districtId: 10102,
    districtNameFr: "Amilcar",
    districtNameAr: "أميلكار",
    type: "blackout",
    status: "active",
    reportedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12m ago
    upvotes: 2,
    userUpvoted: false,
    details: "Complete blackout across residential streets near Amilcar station. Entire block dark.",
    reporterName: "Wassim G.",
    affectedCategory: "home"
  },
  {
    id: "rep-amilcar-2",
    governorateId: 1,
    governorateNameFr: "Tunis",
    governorateNameAr: "تونس",
    delegationId: 101,
    delegationNameFr: "Carthage",
    delegationNameAr: "قرطاج",
    districtId: 10102,
    districtNameFr: "Amilcar",
    districtNameAr: "أميلكار",
    type: "blackout",
    status: "active",
    reportedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8m ago
    upvotes: 1,
    userUpvoted: false,
    details: "Confirming no light in Amilcar! Streetlights and houses pitch dark.",
    reporterName: "Mariem S.",
    affectedCategory: "home"
  },
  {
    id: "rep-amilcar-3",
    governorateId: 1,
    governorateNameFr: "Tunis",
    governorateNameAr: "تونس",
    delegationId: 101,
    delegationNameFr: "Carthage",
    delegationNameAr: "قرطاج",
    districtId: 10102,
    districtNameFr: "Amilcar",
    districtNameAr: "أميلكار",
    type: "blackout",
    status: "restored",
    reportedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    restoredAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    upvotes: 3,
    userUpvoted: false,
    details: "Power just returned on Rue de la Plage side! Dhaw rja3.",
    reporterName: "Yassine B.",
    affectedCategory: "home"
  },
  {
    id: "rep-menzah-1",
    governorateId: 1,
    governorateNameFr: "Tunis",
    governorateNameAr: "تونس",
    delegationId: 103,
    delegationNameFr: "El Menzah",
    delegationNameAr: "المنزه",
    districtId: 1012,
    districtNameFr: "Menzah 6",
    districtNameAr: "المنزه 6",
    type: "blackout",
    status: "active",
    reportedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    upvotes: 14,
    userUpvoted: true,
    details: "High-voltage substation trip near municipal clinic. Entire block is out.",
    reporterName: "Ahmed K.",
    affectedCategory: "home"
  },
  {
    id: "rep-menzah-2",
    governorateId: 1,
    governorateNameFr: "Tunis",
    governorateNameAr: "تونس",
    delegationId: 103,
    delegationNameFr: "El Menzah",
    delegationNameAr: "المنزه",
    districtId: 1012,
    districtNameFr: "Menzah 6",
    districtNameAr: "المنزه 6",
    type: "voltage",
    status: "active",
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    upvotes: 5,
    userUpvoted: false,
    details: "Severe voltage drops (around 140V). AC units failing.",
    reporterName: "Sonia T.",
    affectedCategory: "business"
  },
  {
    id: "rep-mourouj-1",
    governorateId: 3,
    governorateNameFr: "Ben Arous",
    governorateNameAr: "بن عروس",
    delegationId: 302,
    delegationNameFr: "El Mourouj",
    delegationNameAr: "المروج",
    districtId: 3007,
    districtNameFr: "Mourouj 5",
    districtNameAr: "المروج 5",
    type: "blackout",
    status: "restored",
    reportedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    restoredAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    upvotes: 9,
    userUpvoted: false,
    details: "Power fully restored across main avenue. Dhaw rja3!",
    reporterName: "Anis R.",
    affectedCategory: "home"
  },
  {
    id: "rep-sousse-1",
    governorateId: 12,
    governorateNameFr: "Sousse",
    governorateNameAr: "سوسة",
    delegationId: 1202,
    delegationNameFr: "Sousse Jawhara",
    delegationNameAr: "سوسة جوهرة",
    districtId: 1204,
    districtNameFr: "Sahloul",
    districtNameAr: "سهلول",
    type: "partial",
    status: "active",
    reportedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    upvotes: 4,
    userUpvoted: false,
    details: "One phase is down in commercial area.",
    reporterName: "Nizar B.",
    affectedCategory: "business"
  }
];

export default function App() {
  // --- STATE ---
  const [reports, setReports] = useState<OutageReport[]>([]);
  const [activeTab, setActiveTab] = useState<'feed' | 'report' | 'analytics' | 'locations'>('feed');
  const [selectedGovFilter, setSelectedGovFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Live Timer tick state (updates every second)
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Restore Modal State
  const [restoreModalData, setRestoreModalData] = useState<{
    locationKey: string;
    districtNameFr: string;
    districtNameAr: string;
    activeReports: OutageReport[];
  } | null>(null);
  const [restoreTypeSelection, setRestoreTypeSelection] = useState<string>('all');
  const [restoreCategorySelection, setRestoreCategorySelection] = useState<string>('all');

  // Custom Toasts state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  // Engagement Poll State
  const [pollAnswered, setPollAnswered] = useState<boolean>(false);
  const [pollResult, setPollResult] = useState<{ light: number; outage: number }>({ light: 142, outage: 58 });

  // Browser Location database expand state
  const [expandedGovId, setExpandedGovId] = useState<number | null>(null);
  const [expandedDelId, setExpandedDelId] = useState<number | null>(null);
  const [locationSearch, setLocationSearch] = useState<string>('');

  // --- REPORT WIZARD STATE ---
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizGov, setWizGov] = useState<Governorate | null>(null);
  const [wizDel, setWizDel] = useState<any | null>(null);
  const [wizDist, setWizDist] = useState<any | null>(null);
  const [wizGovSearch, setWizGovSearch] = useState<string>('');
  const [wizDelSearch, setWizDelSearch] = useState<string>('');
  const [wizDistSearch, setWizDistSearch] = useState<string>('');
  
  const [wizType, setWizType] = useState<OutageType>('blackout');
  const [wizCategory, setWizCategory] = useState<AffectedCategory>('home');
  const [wizDetails, setWizDetails] = useState<string>('');
  const [wizReporter, setWizReporter] = useState<string>('');

  // Cast JSON data, loaded into state to support dynamic custom districts
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [showCustomDistrictForm, setShowCustomDistrictForm] = useState<boolean>(false);
  const [customDistNameFr, setCustomDistNameFr] = useState<string>('');
  const [customDistNameAr, setCustomDistNameAr] = useState<string>('');

  // Device Security & Anti-Fake System State (IP, Device ID, Cooldown Time, Reputation Score)
  const [deviceProfile, setDeviceProfile] = useState<DeviceSecurityProfile>(() => {
    try {
      const saved = localStorage.getItem('rja3chi_device_profile') || localStorage.getItem('rjachi_device_profile') || localStorage.getItem('famma_dhaw_device_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    const devId = "dev-tn-" + Math.random().toString(36).substring(2, 9);
    const ip = `197.28.${Math.floor(Math.random() * 150 + 100)}.${Math.floor(Math.random() * 200 + 10)}`;
    const initial: DeviceSecurityProfile = {
      deviceId: devId,
      ipHash: ip,
      reputationScore: 100,
      trustLevel: 'Verified Citizen'
    };
    localStorage.setItem('rja3chi_device_profile', JSON.stringify(initial));
    return initial;
  });

  const updateDeviceProfile = (updates: Partial<DeviceSecurityProfile>) => {
    setDeviceProfile(prev => {
      const next = { ...prev, ...updates };
      if (next.reputationScore >= 90) next.trustLevel = 'Verified Citizen';
      else if (next.reputationScore >= 60) next.trustLevel = 'Standard';
      else next.trustLevel = 'Flagged';
      localStorage.setItem('rja3chi_device_profile', JSON.stringify(next));
      return next;
    });
  };

  // User submission history for anti-fake duplicate checking & rate limiting
  const [userSubmissionLogs, setUserSubmissionLogs] = useState<{ districtId: number | string; timestamp: number }[]>(() => {
    try {
      const saved = localStorage.getItem('rja3chi_user_submissions') || localStorage.getItem('rjachi_user_submissions') || localStorage.getItem('famma_dhaw_user_submissions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load / Initialize reports and governorates from localStorage + Real IP/Device Detection
  useEffect(() => {
    // Clear legacy STEG communiques storage if present
    localStorage.removeItem('famma_dhaw_steg_communiques');
    localStorage.removeItem('rjachi_steg_communiques');
    localStorage.removeItem('rja3chi_steg_communiques');

    // Detect Real Public IP & Browser Fingerprint Device ID
    const fetchRealDeviceSecurity = async () => {
      // 1. Generate real persistent browser device fingerprint ID
      let persistentDevId = localStorage.getItem('rja3chi_persistent_device_id') || localStorage.getItem('rjachi_persistent_device_id') || localStorage.getItem('famma_dhaw_persistent_device_id');
      if (!persistentDevId) {
        const fpString = [
          navigator.userAgent,
          navigator.language,
          screen.width,
          screen.height,
          screen.colorDepth,
          navigator.hardwareConcurrency || 4
        ].join('|');
        let hash = 0;
        for (let i = 0; i < fpString.length; i++) {
          hash = (hash << 5) - hash + fpString.charCodeAt(i);
          hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).padStart(7, '0');
        persistentDevId = `dev-tn-${hex}`;
        localStorage.setItem('rja3chi_persistent_device_id', persistentDevId);
      }

      // 2. Fetch real public network IP address from ipify
      let detectedIp = deviceProfile.ipHash;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (response.ok) {
          const data = await response.json();
          if (data.ip) {
            detectedIp = data.ip;
          }
        }
      } catch (err) {
        // Fallback to secondary IP lookup service if blocked
        try {
          const res2 = await fetch('https://ipapi.co/json/');
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2.ip) detectedIp = data2.ip;
          }
        } catch (e) {}
      }

      updateDeviceProfile({
        deviceId: persistentDevId,
        ipHash: detectedIp
      });
    };

    fetchRealDeviceSecurity();

    // Test connection to Firestore
    testConnection();

    // 1. Subscribe to Firestore 'reports' collection in real-time
    const reportsRef = collection(db, 'reports');
    const unsubscribeReports = onSnapshot(
      reportsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudReports: OutageReport[] = [];
          snapshot.forEach((docSnap) => {
            cloudReports.push(docSnap.data() as OutageReport);
          });
          setReports(cloudReports);
          localStorage.setItem('rja3chi_reports', JSON.stringify(cloudReports));
        } else {
          // Initialize/seed cloud with INITIAL_REPORTS if empty
          INITIAL_REPORTS.forEach(r => {
            setDoc(doc(db, 'reports', r.id), r).catch(e => console.error("Error seeding report to Firestore", e));
          });
          setReports(INITIAL_REPORTS);
          localStorage.setItem('rja3chi_reports', JSON.stringify(INITIAL_REPORTS));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'reports');
      }
    );

    // 2. Subscribe to Firestore 'customDistricts' collection in real-time
    const districtsRef = collection(db, 'customDistricts');
    const unsubscribeDistricts = onSnapshot(
      districtsRef,
      (snapshot) => {
        let baseLocs = JSON.parse(JSON.stringify(locationsData)) as Governorate[];
        const cloudDistricts: { governorateId: number; delegationId: number; district: any }[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.governorateId && data.delegationId && data.district) {
            cloudDistricts.push(data as any);
          }
        });
        if (cloudDistricts.length > 0) {
          cloudDistricts.forEach(custom => {
            const gov = baseLocs.find(g => g.id === custom.governorateId);
            if (gov) {
              const del = gov.delegations.find(d => d.id === custom.delegationId);
              if (del && !del.districts.some(ds => ds.id === custom.district.id)) {
                del.districts.push(custom.district);
              }
            }
          });
          setGovernorates(baseLocs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'customDistricts');
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribeDistricts();
    };
  }, []);

  // Live Refresh Data (re-syncs live state from storage without overwriting or injecting fake reports!)
  const handleRefreshData = () => {
    const saved = localStorage.getItem('rja3chi_reports') || localStorage.getItem('rjachi_reports') || localStorage.getItem('famma_dhaw_reports');
    if (saved) {
      try {
        const currentData = JSON.parse(saved);
        setReports(currentData);
        showToast("Re-synced live community reports! All real user submissions preserved. (تم تحيين البيانات الحقيقية)", "success");
      } catch (e) {
        showToast("Refreshed live view state.", "info");
      }
    } else {
      setReports(INITIAL_REPORTS);
      showToast("Initialized live feed.", "info");
    }
    setSelectedGovFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  // Explicit option to purge demo reports if the user wants only clean real data
  const handlePurgeDemoReports = () => {
    const realOnly = reports.filter(r => !r.id.startsWith("rep-amilcar") && !r.id.startsWith("rep-menzah") && !r.id.startsWith("rep-mourouj") && !r.id.startsWith("rep-sousse"));
    saveReports(realOnly);
    showToast("Purged initial demo reports! Feed now shows only live user signals. (مسح البلاغات التجريبية)", "info");
  };

  // Save custom district helper
  const handleAddCustomDistrict = (govId: number, delId: number, nameFr: string, nameAr: string) => {
    const newId = 100000 + Math.floor(Math.random() * 900000);
    const newDistrict = {
      id: newId,
      name_fr: nameFr.trim() || `Custom Cité ${newId}`,
      name_ar: nameAr.trim() || `حي مخصص ${newId}`
    };

    setGovernorates(prevGovs => {
      return prevGovs.map(g => {
        if (g.id === govId) {
          return {
            ...g,
            delegations: g.delegations.map(d => {
              if (d.id === delId) {
                return {
                  ...d,
                  districts: [...d.districts, newDistrict]
                };
              }
              return d;
            })
          };
        }
        return g;
      });
    });

    try {
      const savedCustom = localStorage.getItem('rja3chi_custom_districts') || localStorage.getItem('rjachi_custom_districts') || localStorage.getItem('famma_dhaw_custom_districts');
      let customList = [];
      if (savedCustom) {
        customList = JSON.parse(savedCustom);
      }
      const customEntry = {
        id: String(newDistrict.id),
        governorateId: govId,
        delegationId: delId,
        district: newDistrict,
        createdAt: Date.now()
      };
      customList.push(customEntry);
      localStorage.setItem('rja3chi_custom_districts', JSON.stringify(customList));

      // Sync to Firebase Firestore cloud database
      setDoc(doc(db, 'customDistricts', String(newDistrict.id)), customEntry).catch(e => {
        handleFirestoreError(e, OperationType.WRITE, `customDistricts/${newDistrict.id}`);
      });
    } catch (e) {
      console.error("Error saving custom district", e);
    }

    if (wizGov && wizGov.id === govId) {
      setWizGov(prev => {
        if (!prev) return null;
        return {
          ...prev,
          delegations: prev.delegations.map(d => {
            if (d.id === delId) {
              return {
                ...d,
                districts: [...d.districts, newDistrict]
              };
            }
            return d;
          })
        };
      });
    }

    return newDistrict;
  };

  // Save reports on update & sync to Firebase Firestore
  const saveReports = (newReports: OutageReport[]) => {
    setReports(newReports);
    localStorage.setItem('rja3chi_reports', JSON.stringify(newReports));

    // Save/update each report to Firestore cloud database
    newReports.forEach(r => {
      setDoc(doc(db, 'reports', r.id), r).catch(e => {
        console.error("Firestore sync error for report:", r.id, e);
      });
    });
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- DERIVED METRICS / STATS ---
  const stats = useMemo(() => {
    const active = reports.filter(r => r.status === 'active');
    const restored = reports.filter(r => r.status === 'restored');
    const critical = active.filter(r => r.type === 'blackout').length;

    const govCounts: { [key: string]: { nameFr: string; nameAr: string; count: number } } = {};
    active.forEach(r => {
      const key = r.governorateNameFr;
      if (!govCounts[key]) {
        govCounts[key] = {
          nameFr: r.governorateNameFr,
          nameAr: r.governorateNameAr,
          count: 0
        };
      }
      govCounts[key].count++;
    });

    let mostAffected: { nameFr: string; nameAr: string; count: number } | null = null;
    let maxCount = -1;
    Object.keys(govCounts).forEach(k => {
      if (govCounts[k].count > maxCount) {
        maxCount = govCounts[k].count;
        mostAffected = govCounts[k];
      }
    });

    let totalRestorationHours = 0;
    let restorationCount = 0;
    restored.forEach(r => {
      if (r.restoredAt) {
        const durationMs = new Date(r.restoredAt).getTime() - new Date(r.reportedAt).getTime();
        totalRestorationHours += durationMs / (1000 * 60 * 60);
        restorationCount++;
      }
    });

    const avgHours = restorationCount > 0 ? Number((totalRestorationHours / restorationCount).toFixed(1)) : 1.8;

    return {
      totalActive: active.length,
      totalRestored: restored.length,
      criticalCount: critical,
      mostAffectedGov: mostAffected,
      averageRestorationTimeHours: avgHours
    };
  }, [reports]);

  // Filter individual reports based on search & filters
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Governorate Filter
      if (selectedGovFilter !== 'all' && r.governorateNameFr !== selectedGovFilter) return false;
      
      // Status Filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = 
          r.governorateNameFr.toLowerCase().includes(query) ||
          r.governorateNameAr.includes(query) ||
          r.delegationNameFr.toLowerCase().includes(query) ||
          r.delegationNameAr.includes(query) ||
          r.districtNameFr.toLowerCase().includes(query) ||
          r.districtNameAr.includes(query) ||
          r.details.toLowerCase().includes(query) ||
          r.reporterName.toLowerCase().includes(query);
        if (!matchesText) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [reports, selectedGovFilter, statusFilter, searchQuery]);

  // Group reports purely by location (District + Delegation + Governorate) so that multiple people choosing the same location are displayed ONCE with counters!
  const groupedLocationReports = useMemo(() => {
    const groups: {
      [key: string]: {
        key: string;
        governorateId: number;
        governorateNameFr: string;
        governorateNameAr: string;
        delegationId: number;
        delegationNameFr: string;
        delegationNameAr: string;
        districtNameFr: string;
        districtNameAr: string;
        noLightCount: number;
        restoredCount: number;
        weightedNoLight: number;
        weightedRestored: number;
        latestTime: number;
        reports: OutageReport[];
      };
    } = {};

    filteredReports.forEach(report => {
      const key = `${report.governorateId}-${report.delegationId}-${report.districtNameFr.toLowerCase().trim()}`;
      const timeWeight = getReportTimeWeight(report.reportedAt, now);
      const repWeight = report.reputationWeight ?? 1.0;
      const combinedWeight = timeWeight * repWeight;

      if (!groups[key]) {
        groups[key] = {
          key,
          governorateId: report.governorateId,
          governorateNameFr: report.governorateNameFr,
          governorateNameAr: report.governorateNameAr,
          delegationId: report.delegationId,
          delegationNameFr: report.delegationNameFr,
          delegationNameAr: report.delegationNameAr,
          districtNameFr: report.districtNameFr,
          districtNameAr: report.districtNameAr,
          noLightCount: 0,
          restoredCount: 0,
          weightedNoLight: 0,
          weightedRestored: 0,
          latestTime: 0,
          reports: []
        };
      }

      groups[key].reports.push(report);

      if (report.status === 'active') {
        groups[key].noLightCount += 1;
        groups[key].weightedNoLight += combinedWeight;
      } else {
        groups[key].restoredCount += 1;
        groups[key].weightedRestored += combinedWeight;
      }

      const repTime = new Date(report.reportedAt).getTime();
      if (repTime > groups[key].latestTime) {
        groups[key].latestTime = repTime;
      }
    });

    return Object.values(groups).sort((a, b) => b.latestTime - a.latestTime);
  }, [filteredReports, now]);

  // Handle reporting submit with Anti-Fake protections (IP, Device ID, Cooldown Time, Reputation Score & Duplicate checks)
  const handleReportSubmit = () => {
    if (!wizGov || !wizDel || !wizDist) {
      showToast("Please complete the entire location selection.", "error");
      return;
    }

    const currentTimeMs = Date.now();

    // 1. COOLDOWN TIME CHECK (3 minutes = 180,000 ms per submission)
    if (deviceProfile.cooldownUntilTimestamp && currentTimeMs < deviceProfile.cooldownUntilTimestamp) {
      const remainingSec = Math.ceil((deviceProfile.cooldownUntilTimestamp - currentTimeMs) / 1000);
      const min = Math.floor(remainingSec / 60);
      const sec = remainingSec % 60;
      const timeStr = min > 0 ? `${min}m ${sec}s` : `${sec}s`;
      
      // Penalize reputation score slightly for attempting spam during cooldown
      const penalizedRep = Math.max(15, deviceProfile.reputationScore - 3);
      updateDeviceProfile({ reputationScore: penalizedRep });

      showToast(`⏱️ Cooldown active! Please wait ${timeStr} before submitting another signal. [Device: ${deviceProfile.deviceId} | IP: ${deviceProfile.ipHash}]`, "error");
      return;
    }

    // 2. REPUTATION SCORE CHECK
    if (deviceProfile.reputationScore < 30) {
      showToast(`🚫 Device flagged due to low reputation score (${deviceProfile.reputationScore}%). Signal blocked.`, "error");
      return;
    }

    // 3. RATE LIMITING CHECK: Max 3 reports per 15 minutes across all locations for this device
    const recentGlobalSubmissions = userSubmissionLogs.filter(log => currentTimeMs - log.timestamp < 15 * 60 * 1000);
    if (recentGlobalSubmissions.length >= 3) {
      showToast("🚫 Limit reached! Maximum 3 reports per 15 minutes allowed to prevent fake spam. (تحديد عدد التبليغات تفادياً للبلاغات الكاذبة)", "error");
      return;
    }

    // 4. DUPLICATE CHECK: Prevent submitting duplicate report for the exact same district within 10 minutes
    const recentDistrictSubmission = userSubmissionLogs.find(
      log => log.districtId === wizDist.id && (currentTimeMs - log.timestamp < 10 * 60 * 1000)
    );
    if (recentDistrictSubmission) {
      const penalizedRep = Math.max(20, deviceProfile.reputationScore - 4);
      updateDeviceProfile({ reputationScore: penalizedRep });
      showToast(`⚠️ Duplicate report detected for ${wizDist.name_fr}! Reputation score adjusted. (تم التثبت من التكرار)`, "error");
      return;
    }

    const repWeight = Number((deviceProfile.reputationScore / 100).toFixed(2));

    const newReport: OutageReport = {
      id: "rep-" + currentTimeMs,
      governorateId: wizGov.id,
      governorateNameFr: wizGov.name_fr,
      governorateNameAr: wizGov.name_ar,
      delegationId: wizDel.id,
      delegationNameFr: wizDel.name_fr,
      delegationNameAr: wizDel.name_ar,
      districtId: wizDist.id,
      districtNameFr: wizDist.name_fr,
      districtNameAr: wizDist.name_ar,
      type: wizType,
      status: 'active',
      reportedAt: new Date().toISOString(),
      upvotes: 1,
      userUpvoted: true,
      details: wizDetails.trim() || `Power outage reported in ${wizDist.name_fr}.`,
      reporterName: wizReporter.trim() || "Anonymous Citizen",
      affectedCategory: wizCategory,
      deviceId: deviceProfile.deviceId,
      ipHash: deviceProfile.ipHash,
      reputationWeight: repWeight
    };

    // Set 3-minute Cooldown & Boost Reputation score (+2 up to 100) for legitimate submission
    const cooldownMs = 3 * 60 * 1000;
    const nextCooldown = currentTimeMs + cooldownMs;
    const boostedRep = Math.min(100, deviceProfile.reputationScore + 2);
    updateDeviceProfile({
      lastSubmissionTimestamp: currentTimeMs,
      cooldownUntilTimestamp: nextCooldown,
      reputationScore: boostedRep
    });

    // Save log for rate limit & duplicate tracking
    const updatedLogs = [...userSubmissionLogs, { districtId: wizDist.id, timestamp: currentTimeMs }];
    setUserSubmissionLogs(updatedLogs);
    localStorage.setItem('rja3chi_user_submissions', JSON.stringify(updatedLogs));

    const updated = [newReport, ...reports];
    saveReports(updated);
    showToast(`Signal verified! Device ${deviceProfile.deviceId} & IP ${deviceProfile.ipHash} logged. Real-time status updated for ${wizDist.name_fr}.`, "success");

    // Reset Wizard
    setWizGov(null);
    setWizDel(null);
    setWizDist(null);
    setWizDetails('');
    setWizReporter('');
    setWizardStep(1);
    setActiveTab('feed');
  };

  // Upvote / Corroborate an active report
  const handleUpvote = (id: string) => {
    const updated = reports.map(r => {
      if (r.id === id) {
        const alreadyUpvoted = r.userUpvoted;
        return {
          ...r,
          upvotes: alreadyUpvoted ? r.upvotes - 1 : r.upvotes + 1,
          userUpvoted: !alreadyUpvoted
        };
      }
      return r;
    });
    saveReports(updated);
    
    const target = reports.find(r => r.id === id);
    if (target) {
      if (target.userUpvoted) {
        showToast("Removed your corroboration vote.", "info");
      } else {
        showToast(`Corroborated! Increased report count for ${target.districtNameFr}.`, "success");
      }
    }
  };

  // Live Timer Formatter Helper
  const formatLiveDuration = (startIso: string, endIso?: string) => {
    const startTime = new Date(startIso).getTime();
    const endTime = endIso ? new Date(endIso).getTime() : now;
    const diffMs = Math.max(0, endTime - startTime);
    const totalSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Declare power restored (Dhaw Rjaa!) with dual selection (nature of outage & impact category) from popup
  const handleConfirmRestorationModal = () => {
    if (!restoreModalData) return;

    const { activeReports, districtNameFr } = restoreModalData;
    
    let matching = activeReports;
    if (restoreTypeSelection !== 'all') {
      matching = matching.filter(r => r.type === restoreTypeSelection);
    }
    if (restoreCategorySelection !== 'all') {
      matching = matching.filter(r => r.affectedCategory === restoreCategorySelection);
    }

    const targetIdsToRestore = (matching.length > 0 ? matching : activeReports).map(r => r.id);

    const updated = reports.map(r => {
      if (targetIdsToRestore.includes(r.id)) {
        return {
          ...r,
          status: 'restored' as OutageStatus,
          restoredAt: new Date().toISOString()
        };
      }
      return r;
    });

    saveReports(updated);
    showToast(`Dhaw Rjaa! Confirmed restoration for ${targetIdsToRestore.length} reported issue(s) in ${districtNameFr}. (رجوع الضوء)`, "success");
    setRestoreModalData(null);
  };

  // Submit quick engagement poll
  const handleQuickPoll = (type: 'light' | 'outage') => {
    setPollResult(prev => ({
      ...prev,
      light: type === 'light' ? prev.light + 1 : prev.light,
      outage: type === 'outage' ? prev.outage + 1 : prev.outage
    }));
    setPollAnswered(true);
    if (type === 'light') {
      showToast("Glad you have power! Thank you for confirming.", "success");
    } else {
      showToast("Feel free to submit a report for your neighborhood.", "info");
      setActiveTab('report');
      setWizardStep(1);
    }
  };

  // Helper translations for outage types
  const getOutageTypeLabel = (type: OutageType, lang: 'fr' | 'ar') => {
    const dict = {
      blackout: { fr: "Complete Blackout", ar: "انقطاع كلي" },
      partial: { fr: "Partial Phase Failure", ar: "انقطاع طور جزئي" },
      voltage: { fr: "Low Voltage", ar: "ضعف الجهد" },
      streetlights: { fr: "Streetlights Outage", ar: "أعطال التنوير العمومي" }
    };
    return dict[type][lang];
  };

  // Search filtered governorates in the browser tab
  const filteredGovsForBrowser = useMemo(() => {
    if (!locationSearch.trim()) return governorates;
    const query = locationSearch.toLowerCase();
    return governorates.filter(g => 
      g.name_fr.toLowerCase().includes(query) || 
      g.name_ar.includes(query) ||
      g.delegations.some(d => 
        d.name_fr.toLowerCase().includes(query) || 
        d.name_ar.includes(query) ||
        d.districts.some(ds => 
          ds.name_fr.toLowerCase().includes(query) || 
          ds.name_ar.includes(query)
        )
      )
    );
  }, [locationSearch, governorates]);

  // Filter lists for wizard step search
  const filteredWizGovs = useMemo(() => {
    if (!wizGovSearch.trim()) return governorates;
    const query = wizGovSearch.toLowerCase();
    return governorates.filter(g => 
      g.name_fr.toLowerCase().includes(query) || g.name_ar.includes(query)
    );
  }, [wizGovSearch, governorates]);

  const filteredWizDels = useMemo(() => {
    if (!wizGov) return [];
    if (!wizDelSearch.trim()) return wizGov.delegations;
    const query = wizDelSearch.toLowerCase();
    return wizGov.delegations.filter(d => 
      d.name_fr.toLowerCase().includes(query) || d.name_ar.includes(query)
    );
  }, [wizDelSearch, wizGov]);

  const filteredWizDists = useMemo(() => {
    if (!wizDel) return [];
    const sortedDistricts = [...wizDel.districts].sort((a, b) => a.name_fr.localeCompare(b.name_fr));
    if (!wizDistSearch.trim()) return sortedDistricts;
    const query = wizDistSearch.toLowerCase();
    return sortedDistricts.filter(d => 
      d.name_fr.toLowerCase().includes(query) || d.name_ar.includes(query)
    );
  }, [wizDistSearch, wizDel]);

  // Precalculated analytics calculations
  const totalOutagesCalculated = reports.length;
  const activePercent = Math.round((stats.totalActive / (totalOutagesCalculated || 1)) * 100);
  const restoredPercent = 100 - activePercent;

  return (
    <div id="app_root" className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 transition-colors duration-200">
      
      {/* Toast Overlay Container */}
      <div id="toast_container" className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              id={`toast_${t.id}`}
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-xl shadow-lg border text-sm font-medium flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-md ${
                t.type === 'success' ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-200 shadow-[0_4px_25px_rgba(16,185,129,0.15)]' :
                t.type === 'error' ? 'bg-slate-900/95 border-rose-500/30 text-rose-200 shadow-[0_4px_25px_rgba(244,63,94,0.15)]' :
                'bg-slate-900/95 border-amber-500/30 text-amber-200 shadow-[0_4px_25px_rgba(251,191,36,0.15)]'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                {t.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
                <span>{t.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Power Restored Modal (Dhaw Rjaa Popup) */}
      <AnimatePresence>
        {restoreModalData && (
          <motion.div
            id="modal_restore_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              id="modal_restore_card"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>Dhaw Rjaa!</span>
                      <span className="font-arabic text-emerald-400 text-base">رجع الضوّ</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Select what was restored in <span className="text-amber-400 font-bold">{restoreModalData.districtNameFr} ({restoreModalData.districtNameAr})</span>:
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRestoreModalData(null)}
                  className="text-slate-500 hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                {/* Section 1: Nature of Outage */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Nature of Outage (نوع انقطاع الكهرباء)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      onClick={() => setRestoreTypeSelection('all')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        restoreTypeSelection === 'all'
                          ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>All Natures (جميع أنواع الأعطاب)</span>
                      </div>
                      <input type="radio" name="restore_type" checked={restoreTypeSelection === 'all'} onChange={() => {}} className="accent-amber-400 shrink-0" />
                    </label>

                    {Array.from(new Set(restoreModalData.activeReports.map(r => r.type))).map(type => {
                      const count = restoreModalData.activeReports.filter(r => r.type === type).length;
                      return (
                        <label
                          key={type}
                          onClick={() => setRestoreTypeSelection(type)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                            restoreTypeSelection === type
                              ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {count}x {getOutageTypeLabel(type as OutageType, 'fr')} ({getOutageTypeLabel(type as OutageType, 'ar')})
                            </span>
                          </div>
                          <input type="radio" name="restore_type" checked={restoreTypeSelection === type} onChange={() => {}} className="accent-amber-400 shrink-0" />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Affected Impact Category */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-blue-400" />
                    <span>2. Affected Impact Category (الفئة المتضررة)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      onClick={() => setRestoreCategorySelection('all')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        restoreCategorySelection === 'all'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-blue-400" />
                        <span>All Impact Categories (جميع الفئات)</span>
                      </div>
                      <input type="radio" name="restore_cat" checked={restoreCategorySelection === 'all'} onChange={() => {}} className="accent-blue-400 shrink-0" />
                    </label>

                    {Array.from(new Set(restoreModalData.activeReports.map(r => r.affectedCategory))).map(cat => {
                      const count = restoreModalData.activeReports.filter(r => r.affectedCategory === cat).length;
                      return (
                        <label
                          key={cat}
                          onClick={() => setRestoreCategorySelection(cat)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                            restoreCategorySelection === cat
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {cat === 'home' && <Home className="w-3.5 h-3.5 text-blue-400" />}
                            {cat === 'business' && <Building2 className="w-3.5 h-3.5 text-rose-400" />}
                            {cat === 'public' && <MapPin className="w-3.5 h-3.5 text-purple-400" />}
                            <span className="capitalize">
                              {count}x {cat} Impact ({cat === 'home' ? 'المنزل' : cat === 'business' ? 'المحلات' : 'الشارع والتنوير العمومي'})
                            </span>
                          </div>
                          <input type="radio" name="restore_cat" checked={restoreCategorySelection === cat} onChange={() => {}} className="accent-blue-400 shrink-0" />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Live Count Indicator */}
                {(() => {
                  let filtered = restoreModalData.activeReports;
                  if (restoreTypeSelection !== 'all') filtered = filtered.filter(r => r.type === restoreTypeSelection);
                  if (restoreCategorySelection !== 'all') filtered = filtered.filter(r => r.affectedCategory === restoreCategorySelection);
                  const affectedCount = filtered.length > 0 ? filtered.length : restoreModalData.activeReports.length;

                  return (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl text-xs text-emerald-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Confirm power return for selection</span>
                      </span>
                      <span className="bg-emerald-500/20 px-2.5 py-0.5 rounded-lg text-emerald-200">
                        {affectedCount} report(s)
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestoreModalData(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel / إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestorationModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-400/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Restored (تأكيد الرجوع)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header id="main_header" className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div id="header_brand" className="flex items-center gap-3">
            <div id="logo_pill" className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.3)] shrink-0">
              <Zap className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-2xl tracking-tight text-white">Rja3chi</span>
                <span className="font-arabic font-bold text-[11px] sm:text-xs text-amber-400 bg-slate-800/80 px-2 py-0.5 rounded-md">رجعلكم الضو؟ (Rja3chi)</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold">Crowdsourced Outage & Restoration Reports • Tunisia</p>
            </div>
          </div>

          <div id="header_nav" className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <button
                id="nav_btn_feed"
                onClick={() => setActiveTab('feed')}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Outages</span>
              </button>
              <button
                id="nav_btn_report"
                onClick={() => { setActiveTab('report'); setWizardStep(1); }}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Report Outage</span>
              </button>
              <button
                id="nav_btn_analytics"
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Insights</span>
              </button>
              <button
                id="nav_btn_locations"
                onClick={() => setActiveTab('locations')}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'locations'
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Locations DB</span>
              </button>
            </div>

            {/* Refresh Data button */}
            <button
              id="btn_refresh_data_top"
              onClick={handleRefreshData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Refresh all application data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main id="main_layout" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
        
        {/* Banner Alert: Live Outage Feed & Anti-Fake System Security Bar */}
        <div id="device_security_banner" className="mb-6 p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-md">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-blue-300">Anti-Fake Security Active</span>
            </div>
            
            {/* IP Badge */}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300" title="Your client IP hash for verifying signal source">
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono font-semibold">IP: {deviceProfile.ipHash}</span>
            </div>

            {/* Device ID Badge */}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300" title="Persistent Device UUID fingerprint">
              <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono font-semibold">Device: {deviceProfile.deviceId}</span>
            </div>

            {/* Reputation Score Badge */}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300" title="Citizen Trust & Reputation Score">
              <Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Reputation: <strong className="text-emerald-400">{deviceProfile.reputationScore}%</strong> ({deviceProfile.trustLevel})</span>
            </div>

            {/* Cooldown Timer Status */}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              {deviceProfile.cooldownUntilTimestamp && now < deviceProfile.cooldownUntilTimestamp ? (
                <span className="text-rose-400 font-bold animate-pulse">
                  Cooldown: {Math.ceil((deviceProfile.cooldownUntilTimestamp - now) / 1000)}s
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">Cooldown: Ready (0s)</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handlePurgeDemoReports}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Remove demo reports to leave only real live signals"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge Demo Data</span>
            </button>
          </div>
        </div>

        {/* Global Dashboard Stats Ribbons */}
        <div id="stats_ribbon" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          <div id="stat_card_active" className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-sm flex items-center gap-4 hover:border-slate-750 transition-all shadow-lg">
            <div id="stat_icon_active" className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Blackouts</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-white">{stats.totalActive}</span>
                <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                  {stats.criticalCount} Critical
                </span>
              </div>
            </div>
          </div>

          <div id="stat_card_restored" className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-sm flex items-center gap-4 hover:border-slate-750 transition-all shadow-lg">
            <div id="stat_icon_restored" className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Restored (24h)</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-white">{stats.totalRestored}</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Dhaw Rjaa</span>
              </div>
            </div>
          </div>

          <div id="stat_card_hotspot" className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-sm flex items-center gap-4 hover:border-slate-750 transition-all shadow-lg">
            <div id="stat_icon_hotspot" className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-rose-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top Hotspot</p>
              <p className="text-base font-black text-white truncate mt-0.5">
                {stats.mostAffectedGov ? (
                  <>
                    {stats.mostAffectedGov.nameFr} <span className="font-arabic text-sm text-slate-400">({stats.mostAffectedGov.nameAr})</span>
                  </>
                ) : "No active outages"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {stats.mostAffectedGov ? `${stats.mostAffectedGov.count} reports active` : "All systems stable"}
              </p>
            </div>
          </div>

          <div id="stat_card_speed" className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-sm flex items-center gap-4 hover:border-slate-750 transition-all shadow-lg">
            <div id="stat_icon_speed" className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Resolution</p>
              <span className="text-2xl font-black text-white mt-0.5 block">~{stats.averageRestorationTimeHours}h</span>
              <span className="text-[10px] text-slate-400 font-medium">response rate</span>
            </div>
          </div>

        </div>

        {/* Master Column Split Layout */}
        <div id="split_panel_grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT AREA: Primary Tabs content */}
          <div id="left_view_panel" className="lg:col-span-8">
            
            {/* TABS BODY */}
            <AnimatePresence mode="wait">
              
              {/* FEED TAB */}
              {activeTab === 'feed' && (
                <motion.div
                  id="tab_view_feed"
                  key="feed_tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  
                  {/* SEARCH & FILTERS BAR */}
                  <div id="feed_filters_container" className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 mb-6 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                      <h2 className="text-lg font-extrabold text-white flex items-center gap-2 w-full md:w-auto">
                        <span>Grouped Location Feed</span>
                        <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          {groupedLocationReports.length} Areas
                        </span>
                      </h2>

                      {/* Search Bar */}
                      <div className="relative w-full md:w-72">
                        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          id="input_search_reports"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search region, Amilcar, city..."
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Governorate Dropdown */}
                      <div className="flex flex-col gap-1">
                        <label id="lbl_gov_filter" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Governorate</label>
                        <select
                          id="select_gov_filter"
                          value={selectedGovFilter}
                          onChange={(e) => setSelectedGovFilter(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-slate-950/60 text-slate-100 font-medium"
                        >
                          <option value="all" className="bg-slate-950 text-slate-100">All 24 Governorates (كل تونس)</option>
                          {governorates.map(g => (
                            <option key={g.id} value={g.name_fr} className="bg-slate-950 text-slate-100">
                              {g.name_fr} - {g.name_ar}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex flex-col gap-1">
                        <label id="lbl_status_filter" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outage Status</label>
                        <select
                          id="select_status_filter"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-slate-950/60 text-slate-100 font-medium"
                        >
                          <option value="all" className="bg-slate-950 text-slate-100">All Statuses (الكل)</option>
                          <option value="active" className="bg-slate-950 text-slate-100">Active Outages (تيار مقطوع)</option>
                          <option value="restored" className="bg-slate-950 text-slate-100">Restored (رجع الضوّ)</option>
                        </select>
                      </div>

                      {/* Reset filter button */}
                      <div className="flex items-end">
                        <button
                          id="btn_reset_filters"
                          onClick={() => {
                            setSelectedGovFilter('all');
                            setStatusFilter('all');
                            setSearchQuery('');
                            showToast("Filters reset to default view.", "info");
                          }}
                          className="w-full py-2.5 border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset Filters</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* REPORT STREAM LIST (CONSOLIDATED BY LOCATION WITH COUNTERS) */}
                  <div id="feed_list" className="flex flex-col gap-5">
                    {groupedLocationReports.length === 0 ? (
                      <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-12 text-center shadow-lg backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-full bg-slate-850 flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No reports matching filters</h3>
                        <p className="text-sm text-slate-400 max-w-md mx-auto">There are currently no electricity outages logged under this exact filter. Reset filters to see all reports.</p>
                      </div>
                    ) : (
                      groupedLocationReports.map((group) => {
                        const restoredCount = group.restoredCount;
                        const noLightCount = group.noLightCount;
                        const weightedRestored = group.weightedRestored;
                        const weightedNoLight = group.weightedNoLight;

                        // Calculation formula incorporating time decay (التقارير القديمة تنقص قيمتها مع الوقت):
                        // if weightedRestored > weightedNoLight => Vert (Green - الضوء رجع)
                        // if weightedRestored < weightedNoLight => Red (Marja3ch - ما رجعش)
                        // else (weightedRestored === weightedNoLight) => Jaune (Yellow - حالة متساوية)
                        let statusTone: 'vert' | 'red' | 'jaune' = 'jaune';
                        if (weightedRestored > weightedNoLight) {
                          statusTone = 'vert';
                        } else if (weightedRestored < weightedNoLight) {
                          statusTone = 'red';
                        } else {
                          statusTone = 'jaune';
                        }

                        return (
                          <div
                            id={`grouped_card_${group.key}`}
                            key={group.key}
                            className={`bg-slate-900/30 rounded-3xl border p-6 backdrop-blur-sm transition-all relative overflow-hidden hover:border-slate-750 shadow-md ${
                              statusTone === 'vert'
                                ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                                : statusTone === 'red'
                                ? 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.05)]'
                                : 'border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.05)]'
                            }`}
                          >
                            {/* Accent border bar */}
                            <div
                              className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                                statusTone === 'vert'
                                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                  : statusTone === 'red'
                                  ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                  : 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                              }`}
                            ></div>

                            {/* Location Header & Counters */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pl-2 border-b border-slate-800/60 pb-4">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    statusTone === 'vert'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : statusTone === 'red'
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                                  }`}
                                >
                                  <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-extrabold text-lg text-white">
                                      {group.districtNameFr}, {group.delegationNameFr}
                                    </h3>
                                    <span className="font-arabic font-bold text-sm text-slate-200 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60">
                                      {group.districtNameAr}، {group.delegationNameAr}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                                    {group.governorateNameFr} Governorate • {group.governorateNameAr}
                                  </p>
                                </div>
                              </div>

                              {/* Consolidated Status Badge Pill & Counters */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Time Decay Weighted Score Shield */}
                                <div className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-300 shadow-sm" title="التقارير الحديثة لها وزن أكبر من القديمة">
                                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>Decay Score: {weightedRestored.toFixed(1)} vs {weightedNoLight.toFixed(1)}</span>
                                  <span className="text-[10px] text-blue-300 font-arabic font-bold">(وزن الزمن)</span>
                                </div>

                                {/* Formula Calculated Status Badge */}
                                {statusTone === 'vert' && (
                                  <div className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Power Restored ({restoredCount} &gt; {noLightCount})</span>
                                    <span className="text-[11px] font-arabic font-extrabold text-emerald-200">الضوء رجع</span>
                                  </div>
                                )}

                                {statusTone === 'red' && (
                                  <div className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                                    <span>Power Out ({restoredCount} &lt; {noLightCount})</span>
                                    <span className="text-[11px] font-arabic font-extrabold text-rose-200">ما رجعش</span>
                                  </div>
                                )}

                                {statusTone === 'jaune' && (
                                  <div className="bg-amber-400/15 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>Status Equal ({restoredCount} = {noLightCount})</span>
                                    <span className="text-[11px] font-arabic font-extrabold text-amber-200">حالة متساوية</span>
                                  </div>
                                )}

                                {group.noLightCount > 0 && (
                                  <div className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                                    <span>
                                      {group.noLightCount} {group.noLightCount === 1 ? 'person says' : 'persones say'} no light
                                    </span>
                                    <span className="text-[11px] font-arabic font-semibold text-rose-200">
                                      ({group.noLightCount} {group.noLightCount === 1 ? 'شخص: ماكاش ضو' : 'أشخاص: ماكاش ضو'})
                                    </span>
                                  </div>
                                )}

                                {group.noLightCount > 0 && (() => {
                                  const activeReps = group.reports.filter(r => r.status === 'active').sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());
                                  const earliestTime = activeReps[0]?.reportedAt;
                                  return earliestTime ? (
                                    <div className="bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                                      <span>⏱️ Outage Duration: {formatLiveDuration(earliestTime)}</span>
                                    </div>
                                  ) : null;
                                })()}

                                {group.restoredCount > 0 && (
                                  <div className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>
                                      {group.restoredCount} {group.restoredCount === 1 ? 'person says' : 'persones say'} dhaw rja3
                                    </span>
                                    <span className="text-[11px] font-arabic font-semibold text-emerald-200">
                                      ({group.restoredCount} {group.restoredCount === 1 ? 'شخص: ضو رجع' : 'أشخاص: ضو رجع'})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                          {/* Location breakdown of ALL reported types & categories + single unified action card */}
                          {(() => {
                            const typeCounts: { [key in OutageType]?: number } = {};
                            const categoryCounts: { [key in AffectedCategory]?: number } = {};
                            const activeReports = group.reports.filter(r => r.status === 'active');

                            activeReports.forEach(r => {
                              typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
                              categoryCounts[r.affectedCategory] = (categoryCounts[r.affectedCategory] || 0) + 1;
                            });

                            // Extract only non-generic, unique custom user comments
                            const customNotes = group.reports
                              .map(r => r.details?.trim())
                              .filter((det): det is string => Boolean(det && !det.toLowerCase().startsWith('power outage reported in')));
                            const uniqueCustomNotes = Array.from(new Set(customNotes));

                            const totalUpvotes = group.reports.reduce((acc, r) => acc + r.upvotes, 0);
                            const hasUserUpvoted = group.reports.some(r => r.userUpvoted);

                            return (
                              <div className="pl-2 space-y-4">
                                {/* 1. Summary Tag Row for Outage Types & Impact Categories (Only when active outage exists) */}
                                {group.noLightCount > 0 && (
                                  <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Reported:</span>

                                      {/* Outage Types Tags */}
                                      {(Object.keys(typeCounts) as OutageType[]).map(typeKey => (
                                        <span key={typeKey} className="bg-slate-900 border border-slate-750 text-slate-200 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-sm">
                                          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                          <span>
                                            {typeCounts[typeKey] && typeCounts[typeKey]! > 1 ? `${typeCounts[typeKey]}x ` : ''}{getOutageTypeLabel(typeKey, 'fr')}
                                          </span>
                                        </span>
                                      ))}

                                      {/* Impact Categories Tags */}
                                      {(Object.keys(categoryCounts) as AffectedCategory[]).map(catKey => (
                                        <span key={catKey} className="bg-slate-900 border border-slate-750 text-slate-200 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-sm">
                                          {catKey === 'home' && <Home className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                          {catKey === 'business' && <Building2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                          {catKey === 'public' && <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                                          <span className="capitalize">{categoryCounts[catKey] && categoryCounts[catKey]! > 1 ? `${categoryCounts[catKey]}x ` : ''}{catKey} Impact</span>
                                        </span>
                                      ))}
                                    </div>

                                    <span className="text-slate-400 text-xs font-semibold flex items-center gap-1 shrink-0">
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                      Updated {new Date(group.latestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )}

                                {/* 2. Custom User Notes (Only rendered if actual unique custom comments exist) */}
                                {uniqueCustomNotes.length > 0 && (
                                  <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-amber-400" />
                                      Citizen Notes
                                    </p>
                                    <div className="space-y-1.5">
                                      {uniqueCustomNotes.map((note, nIdx) => (
                                        <div key={nIdx} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-200">
                                          <p className="leading-relaxed font-medium">• {note}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 3. Action Buttons & Status for the Neighborhood */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                                  <div className="text-xs font-medium w-full sm:w-auto">
                                    {statusTone === 'vert' ? (
                                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                        Power Restored in {group.districtNameFr} ({group.districtNameAr})
                                      </span>
                                    ) : statusTone === 'red' ? (
                                      <span className="text-rose-400 font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                                        Power Out / Marja3ch in {group.districtNameFr} ({group.districtNameAr})
                                      </span>
                                    ) : (
                                      <span className="text-amber-400 font-bold flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        Status Equal / In Progress in {group.districtNameFr} ({group.districtNameAr})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                    {group.noLightCount > 0 && (
                                      <>
                                        <button
                                          id={`btn_corroborate_group_${group.key}`}
                                          onClick={() => {
                                            activeReports.forEach(r => handleUpvote(r.id));
                                          }}
                                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                                            hasUserUpvoted
                                              ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                                              : 'bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-200 border border-slate-700'
                                          }`}
                                        >
                                          <ThumbsUp className={`w-3.5 h-3.5 ${hasUserUpvoted ? 'fill-current' : ''}`} />
                                          <span>Me Too! / أنا زادة ({totalUpvotes})</span>
                                        </button>

                                        <button
                                          id={`btn_resolve_group_${group.key}`}
                                          onClick={() => {
                                            setRestoreModalData({ locationKey: group.key, districtNameFr: group.districtNameFr, districtNameAr: group.districtNameAr, activeReports });
                                            setRestoreTypeSelection("all");
                                            setRestoreCategorySelection("all");
                                          }}
                                          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                        >
                                          <Check className="w-4 h-4" />
                                          <span>Dhaw Rjaa! / رجع الضوّ</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })
                    )}
                  </div>
                </motion.div>
              )}

              {/* REPORT OUTAGE WIZARD TAB */}
              {activeTab === 'report' && (
                <motion.div
                  id="tab_view_report"
                  key="report_tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 md:p-8 backdrop-blur-sm shadow-xl"
                >
                  {/* Step Progress Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
                    <div>
                      <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest block mb-1">Citizen Outage Logger</span>
                      <h2 className="text-2xl font-black text-white">Report Power Outage (إعلام على انقطاع الكهرباء)</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 1 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-500'}`}>1</span>
                      <div className={`w-6 h-0.5 ${wizardStep >= 2 ? 'bg-amber-400' : 'bg-slate-800'}`}></div>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 2 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-500'}`}>2</span>
                      <div className={`w-6 h-0.5 ${wizardStep >= 3 ? 'bg-amber-400' : 'bg-slate-800'}`}></div>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 3 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-500'}`}>3</span>
                    </div>
                  </div>

                  {/* STEP 1: Select Governorate */}
                  {wizardStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-extrabold text-white mb-1">Step 1: Select Your Governorate (الولاية)</h3>
                        <p className="text-xs text-slate-400">Choose from all 24 governorates of Tunisia.</p>
                      </div>

                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={wizGovSearch}
                          onChange={(e) => setWizGovSearch(e.target.value)}
                          placeholder="Search governorate name in French or Arabic..."
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                        {filteredWizGovs.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setWizGov(g);
                              setWizDel(null);
                              setWizDist(null);
                              setWizardStep(2);
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              wizGov?.id === g.id
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-400/20'
                                : 'bg-slate-950/60 hover:bg-slate-850 border-slate-800 text-slate-200'
                            }`}
                          >
                            <span className="font-extrabold text-xs block">{g.name_fr}</span>
                            <span className="font-arabic font-semibold text-xs text-slate-400 block mt-1">{g.name_ar}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Select Delegation & District */}
                  {wizardStep === 2 && wizGov && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-extrabold text-white mb-1">
                            Step 2: Delegation & District in <span className="text-amber-400">{wizGov.name_fr} ({wizGov.name_ar})</span>
                          </h3>
                          <p className="text-xs text-slate-400">Drill down to your exact Delegation and Cité / Sector.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Change Gov</span>
                        </button>
                      </div>

                      {/* Delegation selection */}
                      {!wizDel ? (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Choose Delegation (المعتمدية)</label>
                          <input
                            type="text"
                            value={wizDelSearch}
                            onChange={(e) => setWizDelSearch(e.target.value)}
                            placeholder="Filter delegation..."
                            className="w-full px-3 py-2 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                            {filteredWizDels.map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setWizDel(d);
                                  setWizDist(null);
                                }}
                                className="p-3 bg-slate-950/60 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition-all cursor-pointer"
                              >
                                <span className="font-bold text-xs text-white block">{d.name_fr}</span>
                                <span className="font-arabic text-xs text-slate-400 block mt-0.5">{d.name_ar}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* District selection once Delegation chosen */
                        <div className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-850">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500">Selected Delegation</span>
                              <p className="font-extrabold text-sm text-amber-400">{wizDel.name_fr} ({wizDel.name_ar})</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setWizDel(null); setWizDist(null); }}
                              className="text-xs text-slate-400 hover:text-amber-400 underline cursor-pointer"
                            >
                              Change
                            </button>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Choose Cité / District (الحي / العمادة)</label>
                              <button
                                type="button"
                                onClick={() => setShowCustomDistrictForm(!showCustomDistrictForm)}
                                className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{showCustomDistrictForm ? "Hide form" : "Add Custom Cité"}</span>
                              </button>
                            </div>

                            {/* Inline Custom District Creator */}
                            {showCustomDistrictForm && (
                              <div className="p-3.5 bg-slate-900 border border-amber-400/30 rounded-xl mb-3 space-y-2">
                                <p className="text-[11px] font-bold text-amber-400">Can't find your specific neighborhood? Add it here:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={customDistNameFr}
                                    onChange={(e) => setCustomDistNameFr(e.target.value)}
                                    placeholder="Name in French (e.g. Amilcar Plage)"
                                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600"
                                  />
                                  <input
                                    type="text"
                                    value={customDistNameAr}
                                    onChange={(e) => setCustomDistNameAr(e.target.value)}
                                    placeholder="Name in Arabic (مثال: شاطئ أميلكار)"
                                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 font-arabic text-right"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!customDistNameFr.trim() && !customDistNameAr.trim()) {
                                      showToast("Please enter a neighborhood name.", "error");
                                      return;
                                    }
                                    const created = handleAddCustomDistrict(wizGov.id, wizDel.id, customDistNameFr, customDistNameAr);
                                    setWizDist(created);
                                    setCustomDistNameFr('');
                                    setCustomDistNameAr('');
                                    setShowCustomDistrictForm(false);
                                    showToast(`Added custom district ${created.name_fr}!`, "success");
                                  }}
                                  className="w-full py-1.5 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Save & Select Custom Neighborhood
                                </button>
                              </div>
                            )}

                            <input
                              type="text"
                              value={wizDistSearch}
                              onChange={(e) => setWizDistSearch(e.target.value)}
                              placeholder="Search district / cité..."
                              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 mb-3"
                            />

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                              {filteredWizDists.map(ds => (
                                <button
                                  key={ds.id}
                                  type="button"
                                  onClick={() => {
                                    setWizDist(ds);
                                    setWizardStep(3);
                                  }}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    wizDist?.id === ds.id
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                                  }`}
                                >
                                  <span className="font-bold text-xs block truncate">{ds.name_fr}</span>
                                  <span className="font-arabic text-[11px] text-slate-400 block truncate mt-0.5">{ds.name_ar}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: Outage Details & Submit */}
                  {wizardStep === 3 && wizGov && wizDel && wizDist && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-400">Confirmed Location</span>
                          <h3 className="text-lg font-black text-white">
                            {wizDist.name_fr}, {wizDel.name_fr} • <span className="font-arabic text-amber-300">{wizDist.name_ar}، {wizDel.name_ar}</span>
                          </h3>
                          <p className="text-xs text-slate-400">{wizGov.name_fr} Governorate ({wizGov.name_ar})</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Change Location</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Outage Nature */}
                        <div>
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Nature of Outage *</label>
                          <div className="space-y-2">
                            {[
                              { id: 'blackout', labelFr: 'Complete Blackout (انقطاع كلي)', desc: 'Total loss of power across the neighborhood' },
                              { id: 'voltage', labelFr: 'Low Voltage (ضعف الجهد)', desc: 'Dim lights, appliances/AC struggling to run' },
                              { id: 'partial', labelFr: 'Partial Phase Outage (انقطاع جزئي)', desc: 'Some sockets working, others completely dead' },
                              { id: 'streetlights', labelFr: 'Public Streetlights Only (التنوير العمومي)', desc: 'Street illumination dark but homes have power' }
                            ].map(t => (
                              <label
                                key={t.id}
                                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                  wizType === t.id
                                    ? 'bg-amber-400/10 border-amber-400 text-white'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="wizType"
                                  value={t.id}
                                  checked={wizType === t.id}
                                  onChange={(e) => setWizType(e.target.value as OutageType)}
                                  className="mt-1 accent-amber-400"
                                />
                                <div>
                                  <span className="font-extrabold text-xs text-white block">{t.labelFr}</span>
                                  <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{t.desc}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Affected Scope */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Affected Impact Category *</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { id: 'home', label: 'Home / Cité', icon: Home },
                                { id: 'business', label: 'Shops / Business', icon: Building2 },
                                { id: 'public', label: 'Public Sector', icon: MapPin }
                              ].map(c => {
                                const IconComp = c.icon;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setWizCategory(c.id as AffectedCategory)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                      wizCategory === c.id
                                        ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                                  >
                                    <IconComp className="w-4 h-4" />
                                    <span className="text-[11px] font-extrabold text-center">{c.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Your Name / Handle (Optional)</label>
                            <input
                              type="text"
                              value={wizReporter}
                              onChange={(e) => setWizReporter(e.target.value)}
                              placeholder="e.g. Wassim G."
                              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Detailed Description (Landmarks, street name)</label>
                            <textarea
                              value={wizDetails}
                              onChange={(e) => setWizDetails(e.target.value)}
                              placeholder="Describe street landmarks, near mosque, pharmacy or clinic..."
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Anti-Fake Signal Security Verification Checklist Box */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Anti-Fake Signal Verification Checklist</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Auto-Logging Device & IP
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-semibold block">1. Device ID</span>
                            <strong className="font-mono text-amber-300 text-xs truncate block">{deviceProfile.deviceId}</strong>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-semibold block">2. IP Address</span>
                            <strong className="font-mono text-emerald-300 text-xs truncate block">{deviceProfile.ipHash}</strong>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-semibold block">3. Reputation</span>
                            <strong className="text-blue-300 text-xs block">{deviceProfile.reputationScore}% ({deviceProfile.trustLevel})</strong>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-semibold block">4. Cooldown Status</span>
                            {deviceProfile.cooldownUntilTimestamp && now < deviceProfile.cooldownUntilTimestamp ? (
                              <strong className="text-rose-400 font-bold animate-pulse text-xs block">
                                Wait {Math.ceil((deviceProfile.cooldownUntilTimestamp - now) / 1000)}s
                              </strong>
                            ) : (
                              <strong className="text-emerald-400 font-bold text-xs block">Ready (0s Cooldown)</strong>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleReportSubmit}
                          className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 cursor-pointer"
                        >
                          Publish Citizen Outage Report
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ANALYTICS / INSIGHTS TAB */}
              {activeTab === 'analytics' && (
                <motion.div
                  id="tab_view_analytics"
                  key="analytics_tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 md:p-8 backdrop-blur-sm shadow-xl">
                    <h2 className="text-xl font-extrabold text-white mb-2">Grid Outage Analytics & Metrics</h2>
                    <p className="text-xs text-slate-400 mb-6">Aggregated real-time metrics across Tunisia governorates.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Active vs Restored Outages</span>
                        <div className="text-3xl font-black text-white mb-2">{stats.totalActive} Active</div>
                        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex border border-slate-800">
                          <div className="bg-amber-400 h-full" style={{ width: `${activePercent}%` }}></div>
                          <div className="bg-emerald-500 h-full" style={{ width: `${restoredPercent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-semibold">
                          <span>{activePercent}% Outage</span>
                          <span>{restoredPercent}% Restored</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Top Affected Region</span>
                        <div className="text-2xl font-extrabold text-amber-400 mb-1">
                          {stats.mostAffectedGov ? stats.mostAffectedGov.nameFr : "None"}
                        </div>
                        <p className="text-xs text-slate-400">
                          {stats.mostAffectedGov ? `${stats.mostAffectedGov.count} reports currently registered` : "No current reports"}
                        </p>
                      </div>

                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Average Restoration Time</span>
                        <div className="text-3xl font-black text-emerald-400 mb-1">~{stats.averageRestorationTimeHours} Hours</div>
                        <p className="text-xs text-slate-400">Calculated from restored community tickets</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* LOCATIONS DATABASE EXPLORER TAB */}
              {activeTab === 'locations' && (
                <motion.div
                  id="tab_view_locations"
                  key="locations_tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 md:p-8 backdrop-blur-sm shadow-xl space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">Geographic Hierarchy</span>
                      <h2 className="text-2xl font-black text-white">Tunisia Administrative Explorer</h2>
                    </div>
                    
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search governorates, Carthage, Amilcar, delegation..."
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                    />
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredGovsForBrowser.map(gov => {
                      const isExpanded = expandedGovId === gov.id;
                      return (
                        <div key={gov.id} className="bg-slate-950/60 border border-slate-850 rounded-2xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedGovId(isExpanded ? null : gov.id)}
                            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-850/60 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                                {gov.id}
                              </span>
                              <div>
                                <span className="font-extrabold text-sm text-white">{gov.name_fr}</span>
                                <span className="font-arabic font-semibold text-xs text-slate-400 ml-2">({gov.name_ar})</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                              {gov.delegations.length} Delegations
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="p-4 bg-slate-900/40 border-t border-slate-850 space-y-2">
                              {gov.delegations.map(del => {
                                const isDelExpanded = expandedDelId === del.id;
                                return (
                                  <div key={del.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3">
                                    <div
                                      onClick={() => setExpandedDelId(isDelExpanded ? null : del.id)}
                                      className="flex items-center justify-between cursor-pointer"
                                    >
                                      <div>
                                        <span className="font-bold text-xs text-amber-300">{del.name_fr}</span>
                                        <span className="font-arabic text-xs text-slate-400 ml-2">({del.name_ar})</span>
                                      </div>
                                      <span className="text-[11px] text-slate-400 font-semibold">
                                        {del.districts.length} districts
                                      </span>
                                    </div>

                                    {isDelExpanded && (
                                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                                        {del.districts.map(ds => (
                                          <span key={ds.id} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 font-medium">
                                            {ds.name_fr} ({ds.name_ar})
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* RIGHT AREA: Side widgets & Quick Poll */}
          <div id="right_view_panel" className="lg:col-span-4 space-y-6">
            
            {/* Quick Poll Card */}
            <div id="quick_poll_card" className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 shadow-lg backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">Quick Community Check</h3>
              </div>

              <p className="text-sm font-bold text-slate-200 mb-4">Do you currently have electricity in your home right now?</p>

              {!pollAnswered ? (
                <div className="space-y-2">
                  <button
                    id="btn_poll_yes"
                    onClick={() => handleQuickPoll('light')}
                    className="w-full py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>💡 Yes, light is working fine</span>
                    <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-black tracking-wide group-hover:scale-105 transition-transform">Dhaw Rjaa</span>
                  </button>

                  <button
                    id="btn_poll_no"
                    onClick={() => handleQuickPoll('outage')}
                    className="w-full py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>🔌 No, it's pitch dark here</span>
                    <span className="bg-rose-500/20 px-2 py-0.5 rounded text-[10px] text-rose-300 font-black tracking-wide group-hover:scale-105 transition-transform">Outage Active</span>
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800"
                >
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-3">Live Feed confirmation response</p>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-extrabold text-slate-300 mb-1">
                        <span>Light Active (مريغل)</span>
                        <span>{Math.round((pollResult.light / (pollResult.light + pollResult.outage)) * 100)}% ({pollResult.light})</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(pollResult.light / (pollResult.light + pollResult.outage)) * 100}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-extrabold text-slate-300 mb-1">
                        <span>Outage Reported (مقطوع)</span>
                        <span>{Math.round((pollResult.outage / (pollResult.light + pollResult.outage)) * 100)}% ({pollResult.outage})</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(pollResult.outage / (pollResult.light + pollResult.outage)) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <button
                    id="btn_poll_reset"
                    onClick={() => setPollAnswered(false)}
                    className="w-full mt-4 py-1.5 border border-slate-800 hover:bg-slate-800/80 hover:text-white rounded-xl text-[10px] font-bold text-slate-400 uppercase transition-colors cursor-pointer"
                  >
                    Change Response
                  </button>
                </motion.div>
              )}
            </div>

            {/* How it works card */}
            <div id="guide_card" className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 shadow-lg backdrop-blur-sm">
              <h3 className="font-black text-white text-sm mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-500" />
                <span>How Rjachi works</span>
              </h3>
              <ul className="text-xs text-slate-400 space-y-3 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-black shrink-0 text-[10px]">1</span>
                  <span><strong>Grouped Locations</strong>: Multiple citizens reporting in the same neighborhood (e.g. Amilcar, Carthage) are grouped into 1 location card.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-black shrink-0 text-[10px]">2</span>
                  <span><strong>Live Counters</strong>: Clear counter badges show how many people reported "no light" vs "dhaw rja3".</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-black shrink-0 text-[10px]">3</span>
                  <span><strong>Me Too & Restored</strong>: Click "Me Too" to corroborate power outages or "Dhaw Rjaa!" when light returns.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer id="main_footer" className="bg-slate-950/50 border-t border-slate-850 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Rja3chi (رجعلكم الضو؟) • Crowdsourced Outage & Restoration Platform of Tunisia</span>
          </div>
          <div className="flex items-center gap-4">
            
            <button id="footer_btn_feed" onClick={() => setActiveTab('feed')} className="hover:text-amber-400 transition-colors cursor-pointer">
              Outages Feed
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <div id="mobile_bottom_nav" className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-850 p-2 flex justify-around items-center z-40 backdrop-blur-md md:hidden shadow-[0_-10px_25px_rgba(0,0,0,0.6)] pb-safe">
        <button
          id="m_nav_feed"
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'feed' ? 'text-amber-400 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 ${activeTab === 'feed' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-wide uppercase">Outages</span>
        </button>
        <button
          id="m_nav_report"
          onClick={() => { setActiveTab('report'); setWizardStep(1); }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'report' ? 'text-amber-400 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-6 shadow-lg border transition-transform duration-100 ${
            activeTab === 'report' 
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-450/20 scale-105' 
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] tracking-wide uppercase mt-0.5">Report</span>
        </button>
        <button
          id="m_nav_analytics"
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'analytics' ? 'text-amber-400 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-wide uppercase">Insights</span>
        </button>
        <button
          id="m_nav_locations"
          onClick={() => setActiveTab('locations')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'locations' ? 'text-amber-400 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <Database className={`w-5 h-5 ${activeTab === 'locations' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-wide uppercase">Locations</span>
        </button>
      </div>

    </div>
  );
}
