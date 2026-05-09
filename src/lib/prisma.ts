import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

type LocalDb = {
  adminUsers: Array<{ id: number; username: string; passwordHash: string; lastLogin: Date | null; createdAt: Date }>;
  appSettings: Array<{ id: number; llmBaseUrl: string | null; llmApiKey: string | null; llmModel: string | null; updatedAt: Date }>;
  students: Array<{ id: number; latestNis: string | null; name: string; gender: "L" | "P" | null; finalScore: number | null; createdAt: Date }>;
  reportCards: Array<{
    id: number;
    studentId: number;
    nisOnDocument: string | null;
    className: string | null;
    semester: number;
    academicYear: string;
    totalScore: number;
    scoreCount: number;
    averageScore: number;
    scoreBreakdown: unknown;
    fileUrl: string | null;
    status: "ok" | "needs_review" | "failed";
    createdAt: Date;
  }>;
};

const localDbPath = path.join(process.cwd(), ".local-db.json");

function reviveDates(db: LocalDb): LocalDb {
  return {
    ...db,
    adminUsers: db.adminUsers.map((item) => ({ ...item, createdAt: new Date(item.createdAt), lastLogin: item.lastLogin ? new Date(item.lastLogin) : null })),
    appSettings: db.appSettings.map((item) => ({ ...item, updatedAt: new Date(item.updatedAt) })),
    students: db.students.map((item) => ({ ...item, createdAt: new Date(item.createdAt) })),
    reportCards: db.reportCards.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }))
  };
}

function readLocalDb(): LocalDb {
  if (!existsSync(localDbPath)) {
    return { adminUsers: [], appSettings: [], students: [], reportCards: [] };
  }
  return reviveDates(JSON.parse(readFileSync(localDbPath, "utf8")) as LocalDb);
}

function writeLocalDb(db: LocalDb) {
  writeFileSync(localDbPath, JSON.stringify(db, null, 2));
}

function nextId(rows: Array<{ id: number }>) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function orderByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

function attachReports(db: LocalDb, student: LocalDb["students"][number]) {
  return {
    ...student,
    reportCards: db.reportCards
      .filter((row) => row.studentId === student.id)
      .sort((a, b) => a.semester - b.semester || a.academicYear.localeCompare(b.academicYear))
  };
}

function createLocalPrisma() {
  return {
    adminUser: {
      count: async () => readLocalDb().adminUsers.length,
      findUnique: async ({ where }: { where: { username?: string; id?: number } }) => {
        const db = readLocalDb();
        return db.adminUsers.find((row) => (where.username ? row.username === where.username : row.id === where.id)) ?? null;
      },
      update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
        const db = readLocalDb();
        const index = db.adminUsers.findIndex((row) => row.id === where.id);
        if (index < 0) throw new Error("Admin tidak ditemukan.");
        db.adminUsers[index] = { ...db.adminUsers[index], ...data };
        writeLocalDb(db);
        return db.adminUsers[index];
      },
      upsert: async ({ where, create, update }: { where: { username: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const db = readLocalDb();
        const index = db.adminUsers.findIndex((row) => row.username === where.username);
        if (index >= 0) {
          db.adminUsers[index] = { ...db.adminUsers[index], ...update };
          writeLocalDb(db);
          return db.adminUsers[index];
        }
        const row = { id: nextId(db.adminUsers), lastLogin: null, createdAt: new Date(), ...create } as LocalDb["adminUsers"][number];
        db.adminUsers.push(row);
        writeLocalDb(db);
        return row;
      }
    },
    appSettings: {
      findUnique: async ({ where }: { where: { id: number } }) => readLocalDb().appSettings.find((row) => row.id === where.id) ?? null,
      upsert: async ({ where, create, update }: { where: { id: number }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const db = readLocalDb();
        const index = db.appSettings.findIndex((row) => row.id === where.id);
        if (index >= 0) {
          db.appSettings[index] = { ...db.appSettings[index], ...update, updatedAt: new Date() };
          writeLocalDb(db);
          return db.appSettings[index];
        }
        const row = { id: where.id, llmBaseUrl: null, llmApiKey: null, llmModel: null, updatedAt: new Date(), ...create } as LocalDb["appSettings"][number];
        db.appSettings.push(row);
        writeLocalDb(db);
        return row;
      }
    },
    student: {
      count: async () => readLocalDb().students.length,
      findFirst: async ({ where }: { where: { latestNis?: string | null } }) => readLocalDb().students.find((row) => row.latestNis === where.latestNis) ?? null,
      findMany: async (args?: { include?: { reportCards?: unknown }; orderBy?: unknown; take?: number }) => {
        const db = readLocalDb();
        const rows = orderByName(db.students).slice(0, args?.take ?? db.students.length);
        return args?.include?.reportCards ? rows.map((row) => attachReports(db, row)) : rows;
      },
      findUnique: async ({ where, include }: { where: { id: number }; include?: { reportCards?: unknown } }) => {
        const db = readLocalDb();
        const student = db.students.find((row) => row.id === where.id) ?? null;
        if (!student) return null;
        return include?.reportCards ? attachReports(db, student) : student;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const db = readLocalDb();
        const row = { id: nextId(db.students), gender: null, finalScore: null, createdAt: new Date(), ...data } as LocalDb["students"][number];
        db.students.push(row);
        writeLocalDb(db);
        return row;
      },
      update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
        const db = readLocalDb();
        const index = db.students.findIndex((row) => row.id === where.id);
        if (index < 0) throw new Error("Siswa tidak ditemukan.");
        db.students[index] = { ...db.students[index], ...data, finalScore: data.finalScore == null ? null : Number(data.finalScore) };
        writeLocalDb(db);
        return db.students[index];
      }
    },
    reportCard: {
      count: async (args?: { where?: { status?: "ok" | "needs_review" | "failed" } }) => {
        const rows = readLocalDb().reportCards;
        return args?.where?.status ? rows.filter((row) => row.status === args.where?.status).length : rows.length;
      },
      findMany: async ({ where, select }: { where?: { studentId?: number; status?: string }; select?: { averageScore?: boolean } } = {}) => {
        let rows = readLocalDb().reportCards;
        if (where?.studentId) rows = rows.filter((row) => row.studentId === where.studentId);
        if (where?.status) rows = rows.filter((row) => row.status === where.status);
        return select?.averageScore ? rows.map((row) => ({ averageScore: row.averageScore })) : rows;
      },
      findUnique: async ({ where }: { where: { studentId_semester_academicYear: { studentId: number; semester: number; academicYear: string } } }) => {
        const key = where.studentId_semester_academicYear;
        return readLocalDb().reportCards.find((row) => row.studentId === key.studentId && row.semester === key.semester && row.academicYear === key.academicYear) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const db = readLocalDb();
        const row = {
          id: nextId(db.reportCards),
          createdAt: new Date(),
          ...data,
          totalScore: Number(data.totalScore),
          averageScore: Number(data.averageScore)
        } as LocalDb["reportCards"][number];
        db.reportCards.push(row);
        writeLocalDb(db);
        return row;
      }
    },
    $disconnect: async () => undefined
  };
}

export const prisma =
  process.env.LOCAL_JSON_DB === "true"
    ? (createLocalPrisma() as unknown as PrismaClient)
    : globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
      });

if (process.env.NODE_ENV !== "production" && process.env.LOCAL_JSON_DB !== "true") {
  globalForPrisma.prisma = prisma;
}
