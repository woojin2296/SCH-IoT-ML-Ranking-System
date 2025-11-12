export type UserRecord = {
  id: number;
  studentNumber: string;
  email: string;
  name: string | null;
  publicId: string;
  role: string;
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
};

export type UserUpdateParams = {
  id: number;
  studentNumber?: string;
  email?: string;
  name?: string | null;
  role?: string;
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
