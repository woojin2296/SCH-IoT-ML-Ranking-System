import { getDb } from "@/lib/db";

const baseUserProjection = `
  id,
  student_number AS studentNumber,
  name,
  CASE
    WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
    ELSE semester
  END AS semester,
  public_id AS publicId,
  role,
  last_login_at AS lastLoginAt,
  is_active AS isActive,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export type UserRecord = {
  id: number;
  studentNumber: string;
  name: string | null;
  semester: number;
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

export function listUsersOrderedByCreation(): UserRecord[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          ${baseUserProjection}
        FROM users
        ORDER BY created_at ASC
      `,
    )
    .all() as UserRecord[];
}

export function findUserById(id: number): UserRecord | null {
  const db = getDb();
  const record = db
    .prepare(
      `
        SELECT
          ${baseUserProjection}
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id) as UserRecord | undefined;

  return record ?? null;
}

export function findUserByStudentNumber(studentNumber: string): UserRecord | null {
  const db = getDb();
  const record = db
    .prepare(
      `
        SELECT
          ${baseUserProjection}
        FROM users
        WHERE student_number = ?
        LIMIT 1
      `,
    )
    .get(studentNumber) as UserRecord | undefined;

  return record ?? null;
}

export function findUserWithPasswordByStudentNumber(
  studentNumber: string,
): UserWithPasswordRecord | null {
  const db = getDb();
  const record = db
    .prepare(
      `
        SELECT
          ${baseUserProjection},
          password_hash AS passwordHash
        FROM users
        WHERE student_number = ?
        LIMIT 1
      `,
    )
    .get(studentNumber) as UserWithPasswordRecord | undefined;

  return record ?? null;
}

export function isPublicIdTaken(publicId: string): boolean {
  const db = getDb();
  const exists = db.prepare("SELECT 1 FROM users WHERE public_id = ? LIMIT 1").get(publicId);
  return Boolean(exists);
}

export function createUserRecord(input: {
  studentNumber: string;
  passwordHash: string;
  name: string;
  publicId: string;
  role: string;
  semester: number;
}): number {
  const db = getDb();
  const result = db
    .prepare(
      `
        INSERT INTO users (student_number, password_hash, name, public_id, role, semester)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      input.studentNumber,
      input.passwordHash,
      input.name,
      input.publicId,
      input.role,
      input.semester,
    );

  return Number(result.lastInsertRowid);
}

export function updateUserLastLogin(userId: number) {
  const db = getDb();
  db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
}

export function updateUserById(input: {
  id: number;
  name: string;
  studentNumber: string;
  role: string;
  semester: number;
}): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `
        UPDATE users
        SET name = ?, student_number = ?, role = ?, semester = ?
        WHERE id = ?
      `,
    )
    .run(input.name, input.studentNumber, input.role, input.semester, input.id);

  return result.changes > 0;
}
