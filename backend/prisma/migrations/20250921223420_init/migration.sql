-- CreateEnum
CREATE TYPE "public"."Period" AS ENUM ('AM', 'PM');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "codeitbryan" TEXT,
    "GSM" TEXT,
    "mdp" TEXT NOT NULL,
    "sel" TEXT,
    "admin" BOOLEAN DEFAULT false,
    "actif" BOOLEAN DEFAULT true,
    "mdpTemporaire" BOOLEAN DEFAULT true,
    "titre" TEXT,
    "fonction" TEXT,
    "nom" TEXT,
    "prenom" TEXT,
    "niveau" INTEGER DEFAULT 0,
    "revenuQ1" DOUBLE PRECISION DEFAULT 0,
    "revenuQ2" DOUBLE PRECISION DEFAULT 0,
    "entreeFonction" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Eleve" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "idLogiscool" TEXT,
    "mdpLogiscool" TEXT,
    "contingent" TEXT,
    "nomCompletParent" TEXT,
    "nomCompletResponsable1" TEXT,
    "relationResponsable1" TEXT,
    "gsmResponsable1" TEXT,
    "mailResponsable1" TEXT,
    "nomCompletResponsable2" TEXT,
    "relationResponsable2" TEXT,
    "gsmResponsable2" TEXT,
    "mailResponsable2" TEXT,
    "nomCompletResponsable3" TEXT,
    "relationResponsable3" TEXT,
    "gsmResponsable3" TEXT,
    "mailResponsable3" TEXT,
    "retourSeul" BOOLEAN,
    "recuperePar" TEXT,
    "periodeInscription" TEXT,
    "nombreVersements" INTEGER,
    "boursier" BOOLEAN,
    "cpas" BOOLEAN,
    "membreClubCIB" BOOLEAN,
    "nomPartenaire" TEXT,
    "montantBrutQ1" DOUBLE PRECISION,
    "reduction" DOUBLE PRECISION,
    "bourses2024Q1" DOUBLE PRECISION,
    "montantDu" DOUBLE PRECISION,
    "montantFinal" DOUBLE PRECISION,
    "montantPaye" DOUBLE PRECISION,
    "datePayment" TIMESTAMP(3),
    "periodePayment" TEXT,
    "montantBrutQ2" DOUBLE PRECISION,
    "reductionQ2" DOUBLE PRECISION,
    "boursesQ2" DOUBLE PRECISION,
    "montantFinalQ2" DOUBLE PRECISION,
    "montantPayeQ2" DOUBLE PRECISION,
    "datePaymentQ2" TIMESTAMP(3),
    "periodePaymentQ2" TEXT,
    "abandon" BOOLEAN,
    "dateAbandon" TIMESTAMP(3),
    "remarques" TEXT,
    "nomResponsableFiscal" TEXT,
    "prenomResponsableFiscal" TEXT,
    "numRegNatResponsableFiscal" TEXT,
    "numRegNationalEleve" TEXT,
    "dateNaissanceResponsableFiscal" TIMESTAMP(3),
    "adresseResponsableFiscal" TEXT,
    "codePostalResponsableFiscal" TEXT,
    "localiteResponsableFiscal" TEXT,
    "paysResponsableFiscal" TEXT,
    "adresseEleve" TEXT,
    "codePostalEleve" TEXT,
    "localiteEleve" TEXT,
    "paysEleve" TEXT,
    "rrRestantes" DOUBLE PRECISION,

    CONSTRAINT "Eleve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Classe" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "typeCours" TEXT,
    "location" TEXT,
    "salle" TEXT,
    "teacherId" INTEGER NOT NULL,
    "dureeSeance" INTEGER NOT NULL,
    "semainesSeances" TEXT NOT NULL,
    "jourSemaine" INTEGER,
    "heureDebut" TEXT,
    "rrPossibles" BOOLEAN NOT NULL DEFAULT false,
    "isRecuperation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClasseEleve" (
    "id" SERIAL NOT NULL,
    "classeId" INTEGER NOT NULL,
    "eleveId" INTEGER NOT NULL,

    CONSTRAINT "ClasseEleve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Seance" (
    "id" SERIAL NOT NULL,
    "classeId" INTEGER NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL,
    "duree" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'programmee',
    "notes" TEXT,
    "rrPossibles" BOOLEAN NOT NULL DEFAULT false,
    "weekNumber" INTEGER,
    "presentTeacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Presence" (
    "id" SERIAL NOT NULL,
    "seanceId" INTEGER NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'no_status',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Setting" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "order" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PermanenceSlot" (
    "id" SERIAL NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "period" "public"."Period" NOT NULL,
    "userId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanenceSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceDay" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReplacementRequest" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "originSeanceId" INTEGER NOT NULL,
    "destinationSeanceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "destStatut" TEXT NOT NULL DEFAULT 'no_status',
    "notes" TEXT,
    "rrType" TEXT NOT NULL DEFAULT 'same_week',
    "penalizeRR" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClasseEleve_classeId_eleveId_key" ON "public"."ClasseEleve"("classeId", "eleveId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_seanceId_eleveId_key" ON "public"."Presence"("seanceId", "eleveId");

-- CreateIndex
CREATE INDEX "Setting_category_active_idx" ON "public"."Setting"("category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_category_value_key" ON "public"."Setting"("category", "value");

-- CreateIndex
CREATE INDEX "PermanenceSlot_userId_idx" ON "public"."PermanenceSlot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PermanenceSlot_dayOfWeek_period_key" ON "public"."PermanenceSlot"("dayOfWeek", "period");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDay_date_key" ON "public"."AttendanceDay"("date");

-- CreateIndex
CREATE INDEX "AttendanceDay_year_idx" ON "public"."AttendanceDay"("year");

-- CreateIndex
CREATE UNIQUE INDEX "ReplacementRequest_eleveId_originSeanceId_key" ON "public"."ReplacementRequest"("eleveId", "originSeanceId");

-- AddForeignKey
ALTER TABLE "public"."Classe" ADD CONSTRAINT "Classe_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClasseEleve" ADD CONSTRAINT "ClasseEleve_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "public"."Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClasseEleve" ADD CONSTRAINT "ClasseEleve_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Seance" ADD CONSTRAINT "Seance_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "public"."Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Seance" ADD CONSTRAINT "Seance_presentTeacherId_fkey" FOREIGN KEY ("presentTeacherId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Presence" ADD CONSTRAINT "Presence_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "public"."Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Presence" ADD CONSTRAINT "Presence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermanenceSlot" ADD CONSTRAINT "PermanenceSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReplacementRequest" ADD CONSTRAINT "ReplacementRequest_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReplacementRequest" ADD CONSTRAINT "ReplacementRequest_originSeanceId_fkey" FOREIGN KEY ("originSeanceId") REFERENCES "public"."Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReplacementRequest" ADD CONSTRAINT "ReplacementRequest_destinationSeanceId_fkey" FOREIGN KEY ("destinationSeanceId") REFERENCES "public"."Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
