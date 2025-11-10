export type UserRecord = {
  id: number;
  studentNumber: string;
  email: string;
  name: string | null;
  publicId: string;
  role: string;
  semester: number;
  lastLoginAt: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type UserWithPasswordRecord = UserRecord & {
  passwordHash: string;
};

export type UserCreateParams = {
  studentNumber: string;
  email: string;
  passwordHash: string;
  name: string;
  publicId: string;
  role: string;
  semester: number;
};

export type UserUpdateParams = {
  id: number;
  studentNumber?: string;
  email?: string;
  name?: string | null;
  role?: string;
  semester?: number;
  isActive?: number;
};

export type CreateUserPayload = {
  studentNumber: string;
  email: string;
  passwordHash: string;
  name: string;
  publicId: string;
  role: string;
};
