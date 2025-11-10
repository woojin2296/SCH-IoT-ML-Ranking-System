/* eslint-disable no-console */
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import DatabaseConstructor from "better-sqlite3";

const YEARS = [2021, 2022, 2023, 2024];
const USERS_PER_YEAR = 30;
const PROJECTS = [1, 2, 3, 4];
const SUBMISSIONS_PER_PROJECT = 3;

const dbPath = path.join(process.cwd(), "db", "app.db");
const db = new DatabaseConstructor(dbPath);

const passwordHash = bcrypt.hashSync("P@ssw0rd!", 10);

const findUserByStudentNumber = db.prepare("SELECT id FROM users WHERE student_number = ?");

const insertUserStatement = db.prepare(
  `
    INSERT INTO users (
      student_number,
      email,
      password_hash,
      name,
      public_id,
      role,
      semester,
      last_login_at,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, 'user', ?, ?, 1)
  `,
);

const insertScoreStatement = db.prepare(
  `
    INSERT INTO scores (
      user_id,
      project_number,
      score,
      file_path,
      file_name,
      file_type,
      file_size,
      evaluated_at
    )
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
  `,
);

const countScoresByUserAndProject = db.prepare(
  `
    SELECT
      COUNT(*) AS total
    FROM scores
    WHERE user_id = ?
      AND project_number = ?
  `,
);

type SeedStats = {
  usersCreated: number;
  usersReused: number;
  scoresCreated: number;
};

function formatIndex(index: number) {
  return String(index).padStart(3, "0");
}

function buildLastLogin(year: number, userIndex: number) {
  const day = (userIndex % 27) + 1;
  return new Date(Date.UTC(year, 0, day, 9, 0, 0)).toISOString();
}

function computeScore(year: number, userIndex: number, projectNumber: number, submissionIndex: number) {
  const raw =
    (year % 2000) * 73 +
    userIndex * 41 +
    projectNumber * 59 +
    submissionIndex * 97;
  const normalized = (raw % 360) / 10; // 0 - 35.9
  const value = 62 + normalized;
  return Number(value.toFixed(2));
}

function computeFileSize(userIndex: number, projectNumber: number, submissionIndex: number) {
  const base = (userIndex * 113 + projectNumber * 997 + submissionIndex * 431) % 900000;
  return 75_000 + base;
}

function buildEvaluationDate(year: number, projectNumber: number, submissionIndex: number, userIndex: number) {
  const monthIndex = (projectNumber - 1) * 3 + (submissionIndex - 1);
  const day = ((userIndex + submissionIndex) % 26) + 1;
  const hour = 9 + submissionIndex;
  return new Date(Date.UTC(year, monthIndex, day, hour, (userIndex * 5) % 60, 0)).toISOString();
}

const seedDummyData = db.transaction((): SeedStats => {
  const stats: SeedStats = {
    usersCreated: 0,
    usersReused: 0,
    scoresCreated: 0,
  };

  for (const year of YEARS) {
    for (let index = 1; index <= USERS_PER_YEAR; index += 1) {
      const suffix = formatIndex(index);
      const studentNumber = `${year}${suffix}`;
      const email = `student${year}${suffix}@example.com`;
      const name = `더미유저 ${year}-${suffix}`;
      const publicId = `user-${year}-${suffix}-${randomUUID().slice(0, 8)}`;
      const lastLoginAt = buildLastLogin(year, index);

      const existingUser = findUserByStudentNumber.get(studentNumber) as { id: number } | undefined;
      const userId =
        existingUser?.id ??
        Number(
          insertUserStatement.run(
            studentNumber,
            email,
            passwordHash,
            name,
            publicId,
            year,
            lastLoginAt,
          ).lastInsertRowid,
        );

      if (existingUser) {
        stats.usersReused += 1;
      } else {
        stats.usersCreated += 1;
      }

      for (const projectNumber of PROJECTS) {
        const scoreCountRow = countScoresByUserAndProject.get(userId, projectNumber) as { total: number } | undefined;
        const existingScoreCount = scoreCountRow?.total ?? 0;
        if (existingScoreCount >= SUBMISSIONS_PER_PROJECT) {
          continue;
        }

        for (let submissionIndex = existingScoreCount + 1; submissionIndex <= SUBMISSIONS_PER_PROJECT; submissionIndex += 1) {
          const scoreValue = computeScore(year, index, projectNumber, submissionIndex);
          const evaluatedAt = buildEvaluationDate(year, projectNumber, submissionIndex, index);
          const fileName = `project-${projectNumber}-submission-${suffix}-${submissionIndex}.ipynb`;
          const fileSize = computeFileSize(index, projectNumber, submissionIndex);

          insertScoreStatement.run(
            userId,
            projectNumber,
            scoreValue,
            fileName,
            "application/json",
            fileSize,
            evaluatedAt,
          );
          stats.scoresCreated += 1;
        }
      }
    }
  }

  return stats;
});

const result = seedDummyData();

console.log("---- Dummy data generation complete ----");
console.log(`New users created: ${result.usersCreated}`);
console.log(`Existing seed users reused: ${result.usersReused}`);
console.log(`Scores inserted: ${result.scoresCreated}`);

db.close();
