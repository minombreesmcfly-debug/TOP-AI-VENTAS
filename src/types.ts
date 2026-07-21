export type DemoStatus = 'new' | 'contacted' | 'offered' | 'accepted' | 'sent' | 'paid' | 'recurring';
export type PackageStatus = 'none' | 'basic' | 'premium';
export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'blocked';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  state?: string;
  pin?: string; // Security PIN / password
  trio?: string; // User's custom trio
  mins?: string; // User's assigned minutes
  bankName?: string;
  accountNumber?: string;
  clabe?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Lead {
  id: string;
  name: string;
  businessOwnerName?: string;
  city?: string;
  lastContactDate?: string;
  followUpDate?: string;
  notes?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  demoStatus: DemoStatus;
  packageStatus: PackageStatus;
  ownerId: string;
  assignedUserIds: string[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export const PACKAGE_INFO = {
  none: { name: 'Sin Paquete', price: 0, details: '' },
  basic: { name: 'Básico (1,500 MXN)', price: 1500, details: '2 ads + 5 posts' },
  premium: { name: 'Premium (3,000 MXN)', price: 3000, details: '4 videos + 10 posts' },
};

export const DEMO_STATUS_COLORS = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-indigo-100 text-indigo-700',
  offered: 'bg-blue-100 text-blue-700',
  accepted: 'bg-purple-100 text-purple-700',
  sent: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  recurring: 'bg-rose-100 text-rose-700',
};
