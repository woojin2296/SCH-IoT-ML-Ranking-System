export type UserRecord = {
  id: number;
  studentNumber: string;
  email: string | null;
  name: string | null;
  publicId: string;
  role: string;
  semester: number;
  lastLoginAt: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};
