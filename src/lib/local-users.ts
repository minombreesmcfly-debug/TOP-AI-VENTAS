import { UserProfile } from '../types';

const LOCAL_USERS_KEY = 'top_ai_mkt_local_users';

export function getLocalUsers(): UserProfile[] {
  try {
    const data = localStorage.getItem(LOCAL_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn("Failed to parse local users:", err);
    return [];
  }
}

export function saveLocalUser(user: UserProfile): void {
  try {
    const users = getLocalUsers();
    const cleanUser = {
      ...user,
      // Ensure we convert Firestore timestamps to string/Date equivalent for local storage if needed
      createdAt: user.createdAt ? (typeof user.createdAt === 'object' && 'toDate' in user.createdAt ? (user.createdAt as any).toDate().toISOString() : user.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const index = users.findIndex(u => u.uid === user.uid || u.phone === user.phone);
    if (index > -1) {
      users[index] = { ...users[index], ...cleanUser };
    } else {
      users.push(cleanUser);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Failed to save local user:", err);
  }
}

export function syncAndMergeUsers(firestoreUsers: UserProfile[]): UserProfile[] {
  const localUsers = getLocalUsers();
  
  // Start with local users
  const mergedMap = new Map<string, UserProfile>();
  
  // Load local users first
  localUsers.forEach(u => {
    if (u.uid) mergedMap.set(u.uid, u);
  });
  
  // Overwrite or merge with Firestore users (Firestore is source of truth if online)
  firestoreUsers.forEach(u => {
    if (u.uid) {
      mergedMap.set(u.uid, u);
      // Keep local storage synchronized with what we get from Firestore
      saveLocalUser(u);
    }
  });
  
  return Array.from(mergedMap.values());
}
