--
-- PostgreSQL database dump
--

\restrict bMcnHPqcANYuuOPqiQG7kOl1wQlyMILiaxxH1yfFKkpN7mFgCPvvhDU38DNumX7

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: coding_problem_difficulty_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.coding_problem_difficulty_enum AS ENUM (
    'SIMPLE',
    'MEDIUM',
    'DEEP'
);


ALTER TYPE public.coding_problem_difficulty_enum OWNER TO postgres;

--
-- Name: coding_submissions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.coding_submissions_status_enum AS ENUM (
    'PENDING',
    'CHECKING',
    'CHECKED',
    'FAILED'
);


ALTER TYPE public.coding_submissions_status_enum OWNER TO postgres;

--
-- Name: groups_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.groups_status_enum AS ENUM (
    'ACTIVE',
    'PAUSED',
    'FINISHED'
);


ALTER TYPE public.groups_status_enum OWNER TO postgres;

--
-- Name: homework_submissions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.homework_submissions_status_enum AS ENUM (
    'SUBMITTED',
    'GRADED'
);


ALTER TYPE public.homework_submissions_status_enum OWNER TO postgres;

--
-- Name: payments_kind_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_kind_enum AS ENUM (
    'MANUAL',
    'FULL',
    'MONTHLY',
    'REMAINDER'
);


ALTER TYPE public.payments_kind_enum OWNER TO postgres;

--
-- Name: payments_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_method_enum AS ENUM (
    'CASH',
    'CARD',
    'CLICK',
    'PAYME',
    'TRANSFER'
);


ALTER TYPE public.payments_method_enum OWNER TO postgres;

--
-- Name: payments_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_status_enum AS ENUM (
    'PAID',
    'UNPAID',
    'PARTIAL'
);


ALTER TYPE public.payments_status_enum OWNER TO postgres;

--
-- Name: points_logs_source_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.points_logs_source_enum AS ENUM (
    'ATTENDANCE',
    'TEST',
    'HOMEWORK',
    'MANUAL',
    'SHOP'
);


ALTER TYPE public.points_logs_source_enum OWNER TO postgres;

--
-- Name: question_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type_enum AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);


ALTER TYPE public.question_type_enum OWNER TO postgres;

--
-- Name: student_groups_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.student_groups_status_enum AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'LEFT'
);


ALTER TYPE public.student_groups_status_enum OWNER TO postgres;

--
-- Name: test_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.test_status_enum AS ENUM (
    'ACTIVE',
    'IN_PROGRESS',
    'NOACTIVE',
    'PAUSED',
    'FINISHED'
);


ALTER TYPE public.test_status_enum OWNER TO postgres;

--
-- Name: test_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.test_type_enum AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);


ALTER TYPE public.test_type_enum OWNER TO postgres;

--
-- Name: users_gender_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_gender_enum AS ENUM (
    'MALE',
    'FEMALE'
);


ALTER TYPE public.users_gender_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'SUPERADMIN',
    'ADMIN',
    'TEACHER',
    'SUPPORT',
    'STUDENT',
    'PARENT',
    'MANAGER',
    'MARKETING',
    'SALES',
    'FINANCE',
    'HR'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

--
-- Name: users_salarymode_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_salarymode_enum AS ENUM (
    'FIXED',
    'PER_LESSON'
);


ALTER TYPE public.users_salarymode_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "studentId" integer NOT NULL,
    "isPresent" boolean DEFAULT true NOT NULL,
    type character varying,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying(150) NOT NULL,
    address text,
    phone character varying
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: cancelled_lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cancelled_lessons (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "groupId" integer NOT NULL,
    date date NOT NULL,
    reason text,
    "createdById" integer
);


ALTER TABLE public.cancelled_lessons OWNER TO postgres;

--
-- Name: cancelled_lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cancelled_lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cancelled_lessons_id_seq OWNER TO postgres;

--
-- Name: cancelled_lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cancelled_lessons_id_seq OWNED BY public.cancelled_lessons.id;


--
-- Name: choices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.choices (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    text text NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL,
    "questionId" integer NOT NULL,
    "textEn" text,
    "textRu" text
);


ALTER TABLE public.choices OWNER TO postgres;

--
-- Name: choices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.choices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.choices_id_seq OWNER TO postgres;

--
-- Name: choices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.choices_id_seq OWNED BY public.choices.id;


--
-- Name: coding_problem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coding_problem (
    id integer NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    difficulty public.coding_problem_difficulty_enum DEFAULT 'MEDIUM'::public.coding_problem_difficulty_enum NOT NULL,
    "starterCode" text,
    "sampleInput" text,
    "sampleOutput" text,
    constraints text,
    "referenceSolution" text,
    "testId" integer,
    "generatedBy" character varying DEFAULT 'AI'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coding_problem OWNER TO postgres;

--
-- Name: coding_problem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coding_problem_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coding_problem_id_seq OWNER TO postgres;

--
-- Name: coding_problem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coding_problem_id_seq OWNED BY public.coding_problem.id;


--
-- Name: coding_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coding_submissions (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "problemId" integer NOT NULL,
    "studentId" integer NOT NULL,
    "testResultId" integer,
    code text NOT NULL,
    language character varying DEFAULT 'javascript'::character varying NOT NULL,
    status public.coding_submissions_status_enum DEFAULT 'PENDING'::public.coding_submissions_status_enum NOT NULL,
    "aiScore" double precision,
    "aiFeedback" jsonb,
    "checkedAt" timestamp with time zone
);


ALTER TABLE public.coding_submissions OWNER TO postgres;

--
-- Name: coding_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coding_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coding_submissions_id_seq OWNER TO postgres;

--
-- Name: coding_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coding_submissions_id_seq OWNED BY public.coding_submissions.id;


--
-- Name: directions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.directions (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(12,2),
    "durationMonths" integer
);


ALTER TABLE public.directions OWNER TO postgres;

--
-- Name: directions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.directions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directions_id_seq OWNER TO postgres;

--
-- Name: directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.directions_id_seq OWNED BY public.directions.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    status public.groups_status_enum DEFAULT 'ACTIVE'::public.groups_status_enum NOT NULL,
    "teacherId" integer NOT NULL,
    "directionId" integer,
    "startDate" date,
    "endDate" date,
    "supportId" integer,
    "lessonDays" text,
    "lessonTime" character varying,
    "lessonDuration" integer,
    "branchId" integer
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: homework_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homework_assignments (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    title character varying NOT NULL,
    description text,
    "groupId" integer NOT NULL,
    "createdById" integer NOT NULL,
    deadline character varying
);


ALTER TABLE public.homework_assignments OWNER TO postgres;

--
-- Name: homework_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.homework_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homework_assignments_id_seq OWNER TO postgres;

--
-- Name: homework_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.homework_assignments_id_seq OWNED BY public.homework_assignments.id;


--
-- Name: homework_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homework_submissions (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "assignmentId" integer NOT NULL,
    "studentId" integer NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    "isCurrent" boolean DEFAULT true NOT NULL,
    "textContent" text,
    "fileName" text,
    "fileData" text,
    "fileSizeBytes" integer,
    "fileExpired" boolean DEFAULT false NOT NULL,
    status public.homework_submissions_status_enum DEFAULT 'SUBMITTED'::public.homework_submissions_status_enum NOT NULL,
    score double precision,
    feedback text,
    "gradedAt" timestamp with time zone,
    "gradedById" integer,
    "submittedAt" timestamp with time zone NOT NULL,
    "fileUrl" text,
    "fileKey" text
);


ALTER TABLE public.homework_submissions OWNER TO postgres;

--
-- Name: homework_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.homework_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homework_submissions_id_seq OWNER TO postgres;

--
-- Name: homework_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.homework_submissions_id_seq OWNED BY public.homework_submissions.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "senderId" integer,
    "recipientId" integer NOT NULL,
    type character varying DEFAULT 'MESSAGE'::character varying NOT NULL,
    title character varying DEFAULT 'Xabar'::character varying NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: parents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parents (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "userId" integer NOT NULL,
    phone2 character varying
);


ALTER TABLE public.parents OWNER TO postgres;

--
-- Name: parents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parents_id_seq OWNER TO postgres;

--
-- Name: parents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parents_id_seq OWNED BY public.parents.id;


--
-- Name: payment_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_settings (
    id integer DEFAULT 1 NOT NULL,
    "fullPaymentDiscountPercent" numeric(5,2) DEFAULT '10'::numeric NOT NULL
);


ALTER TABLE public.payment_settings OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "studentId" integer NOT NULL,
    "groupId" integer,
    amount numeric(12,2) NOT NULL,
    method public.payments_method_enum DEFAULT 'CASH'::public.payments_method_enum NOT NULL,
    status public.payments_status_enum DEFAULT 'PAID'::public.payments_status_enum NOT NULL,
    kind public.payments_kind_enum DEFAULT 'MANUAL'::public.payments_kind_enum NOT NULL,
    "discountPercent" numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    month character varying,
    "monthsCovered" text,
    "paidAt" timestamp with time zone,
    comment text,
    "createdById" integer
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: points_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.points_logs (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "studentId" integer NOT NULL,
    source public.points_logs_source_enum NOT NULL,
    amount integer NOT NULL,
    note text,
    "refId" integer,
    "noteKey" character varying,
    "noteParams" jsonb
);


ALTER TABLE public.points_logs OWNER TO postgres;

--
-- Name: points_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.points_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.points_logs_id_seq OWNER TO postgres;

--
-- Name: points_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.points_logs_id_seq OWNED BY public.points_logs.id;


--
-- Name: question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question (
    id integer NOT NULL,
    text character varying NOT NULL,
    "testId" integer,
    "isBank" boolean DEFAULT false NOT NULL,
    "directionId" integer,
    "lessonNumber" integer,
    type public.question_type_enum,
    "textEn" text,
    "textRu" text
);


ALTER TABLE public.question OWNER TO postgres;

--
-- Name: question_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_id_seq OWNER TO postgres;

--
-- Name: question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_id_seq OWNED BY public.question.id;


--
-- Name: salary_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_settings (
    id integer DEFAULT 1 NOT NULL,
    "teacherPerLessonRate" integer DEFAULT 50000 NOT NULL,
    "supportPerLessonRate" integer DEFAULT 30000 NOT NULL
);


ALTER TABLE public.salary_settings OWNER TO postgres;

--
-- Name: shop_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shop_items (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    description text,
    cost integer NOT NULL,
    "imageUrl" text,
    stock integer
);


ALTER TABLE public.shop_items OWNER TO postgres;

--
-- Name: shop_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shop_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shop_items_id_seq OWNER TO postgres;

--
-- Name: shop_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shop_items_id_seq OWNED BY public.shop_items.id;


--
-- Name: student_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_groups (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "studentId" integer NOT NULL,
    "groupId" integer NOT NULL,
    "joinedAt" date,
    "leftAt" date,
    status public.student_groups_status_enum DEFAULT 'ACTIVE'::public.student_groups_status_enum NOT NULL
);


ALTER TABLE public.student_groups OWNER TO postgres;

--
-- Name: student_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_groups_id_seq OWNER TO postgres;

--
-- Name: student_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_groups_id_seq OWNED BY public.student_groups.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "cardId" character varying,
    "userId" integer NOT NULL,
    "parentId" integer,
    "groupId" integer,
    points integer DEFAULT 0 NOT NULL,
    "fullPaymentDiscountPercent" numeric(5,2),
    "monthlyDiscountPercent" numeric(5,2)
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: support_availabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_availabilities (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "supportId" integer NOT NULL,
    date date NOT NULL,
    "startTime" character varying NOT NULL,
    "endTime" character varying NOT NULL
);


ALTER TABLE public.support_availabilities OWNER TO postgres;

--
-- Name: support_availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_availabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_availabilities_id_seq OWNER TO postgres;

--
-- Name: support_availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_availabilities_id_seq OWNED BY public.support_availabilities.id;


--
-- Name: support_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_bookings (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "supportId" integer NOT NULL,
    "studentId" integer NOT NULL,
    date date NOT NULL,
    "startTime" character varying NOT NULL,
    "endTime" character varying NOT NULL,
    "durationMinutes" integer NOT NULL
);


ALTER TABLE public.support_bookings OWNER TO postgres;

--
-- Name: support_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_bookings_id_seq OWNER TO postgres;

--
-- Name: support_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_bookings_id_seq OWNED BY public.support_bookings.id;


--
-- Name: test; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test (
    id integer NOT NULL,
    title character varying NOT NULL,
    type public.test_type_enum NOT NULL,
    status public.test_status_enum DEFAULT 'ACTIVE'::public.test_status_enum NOT NULL,
    "minScore" integer,
    "startsAt" timestamp with time zone,
    "endsAt" timestamp with time zone,
    "durationMinutes" integer,
    "directionId" integer,
    "groupId" integer,
    "lessonNumber" integer,
    "weekNumber" integer,
    "monthNumber" integer DEFAULT 1,
    "createdById" integer,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "problemCount" integer DEFAULT 0,
    "problemDifficultyMix" jsonb
);


ALTER TABLE public.test OWNER TO postgres;

--
-- Name: test_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.test_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.test_id_seq OWNER TO postgres;

--
-- Name: test_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.test_id_seq OWNED BY public.test.id;


--
-- Name: test_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_results (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    score double precision NOT NULL,
    "testId" integer NOT NULL,
    "studentId" integer NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    "isCurrent" boolean DEFAULT true NOT NULL,
    answers jsonb,
    "startedAt" timestamp with time zone,
    "submittedAt" timestamp with time zone,
    "timeSpentSeconds" integer,
    "forceScoreZero" boolean DEFAULT false NOT NULL,
    "violationReason" character varying,
    "problemsScore" double precision,
    "problemsChecked" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.test_results OWNER TO postgres;

--
-- Name: test_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.test_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.test_results_id_seq OWNER TO postgres;

--
-- Name: test_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.test_results_id_seq OWNED BY public.test_results.id;


--
-- Name: user_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activities (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "userId" integer,
    method character varying(30) NOT NULL,
    path text NOT NULL,
    action text,
    "statusCode" integer,
    ip text,
    "userAgent" text
);


ALTER TABLE public.user_activities OWNER TO postgres;

--
-- Name: user_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activities_id_seq OWNER TO postgres;

--
-- Name: user_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_activities_id_seq OWNED BY public.user_activities.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    phone character varying NOT NULL,
    username character varying NOT NULL,
    password character varying NOT NULL,
    role public.users_role_enum NOT NULL,
    "telegramId" character varying,
    "fullName" character varying NOT NULL,
    "directionId" integer,
    "directionIds" text,
    "branchId" integer,
    avatar text,
    "lastLoginAt" timestamp without time zone,
    "lastSeenAt" timestamp without time zone,
    gender public.users_gender_enum,
    "grantedRoles" text,
    salary integer,
    "salaryMode" public.users_salarymode_enum DEFAULT 'FIXED'::public.users_salarymode_enum NOT NULL,
    "perLessonRate" integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: cancelled_lessons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelled_lessons ALTER COLUMN id SET DEFAULT nextval('public.cancelled_lessons_id_seq'::regclass);


--
-- Name: choices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices ALTER COLUMN id SET DEFAULT nextval('public.choices_id_seq'::regclass);


--
-- Name: coding_problem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_problem ALTER COLUMN id SET DEFAULT nextval('public.coding_problem_id_seq'::regclass);


--
-- Name: coding_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_submissions ALTER COLUMN id SET DEFAULT nextval('public.coding_submissions_id_seq'::regclass);


--
-- Name: directions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.directions ALTER COLUMN id SET DEFAULT nextval('public.directions_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: homework_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_assignments ALTER COLUMN id SET DEFAULT nextval('public.homework_assignments_id_seq'::regclass);


--
-- Name: homework_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_submissions ALTER COLUMN id SET DEFAULT nextval('public.homework_submissions_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: parents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parents ALTER COLUMN id SET DEFAULT nextval('public.parents_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: points_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_logs ALTER COLUMN id SET DEFAULT nextval('public.points_logs_id_seq'::regclass);


--
-- Name: question id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question ALTER COLUMN id SET DEFAULT nextval('public.question_id_seq'::regclass);


--
-- Name: shop_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shop_items ALTER COLUMN id SET DEFAULT nextval('public.shop_items_id_seq'::regclass);


--
-- Name: student_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_groups ALTER COLUMN id SET DEFAULT nextval('public.student_groups_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: support_availabilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_availabilities ALTER COLUMN id SET DEFAULT nextval('public.support_availabilities_id_seq'::regclass);


--
-- Name: support_bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_bookings ALTER COLUMN id SET DEFAULT nextval('public.support_bookings_id_seq'::regclass);


--
-- Name: test id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test ALTER COLUMN id SET DEFAULT nextval('public.test_id_seq'::regclass);


--
-- Name: test_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_results ALTER COLUMN id SET DEFAULT nextval('public.test_results_id_seq'::regclass);


--
-- Name: user_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities ALTER COLUMN id SET DEFAULT nextval('public.user_activities_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: user_activities PK_1245d4d2cf04ba7743f2924d951; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT "PK_1245d4d2cf04ba7743f2924d951" PRIMARY KEY (id);


--
-- Name: choices PK_148c5eb882356807bc188a826c3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT "PK_148c5eb882356807bc188a826c3" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: question PK_21e5786aa0ea704ae185a79b2d5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY (id);


--
-- Name: shop_items PK_413571c2dd7b80fd08551cf7726; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT "PK_413571c2dd7b80fd08551cf7726" PRIMARY KEY (id);


--
-- Name: test PK_5417af0062cf987495b611b59c7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test
    ADD CONSTRAINT "PK_5417af0062cf987495b611b59c7" PRIMARY KEY (id);


--
-- Name: groups PK_659d1483316afb28afd3a90646e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: test_results PK_6af5df01fcd3971b362fc828296; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_results
    ADD CONSTRAINT "PK_6af5df01fcd3971b362fc828296" PRIMARY KEY (id);


--
-- Name: payment_settings PK_78624861ce2178d6835fb1d9fdf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_settings
    ADD CONSTRAINT "PK_78624861ce2178d6835fb1d9fdf" PRIMARY KEY (id);


--
-- Name: students PK_7d7f07271ad4ce999880713f05e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY (id);


--
-- Name: branches PK_7f37d3b42defea97f1df0d19535; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: parents PK_9a4dc67c7b8e6a9cb918938d353; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT "PK_9a4dc67c7b8e6a9cb918938d353" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: points_logs PK_aab675e6f91e644f3c2ed104b54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_logs
    ADD CONSTRAINT "PK_aab675e6f91e644f3c2ed104b54" PRIMARY KEY (id);


--
-- Name: coding_submissions PK_b282a7e052a7a6632a8fbc2f51d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT "PK_b282a7e052a7a6632a8fbc2f51d" PRIMARY KEY (id);


--
-- Name: coding_problem PK_ce1bb9aa4958320109a81265346; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_problem
    ADD CONSTRAINT "PK_ce1bb9aa4958320109a81265346" PRIMARY KEY (id);


--
-- Name: cancelled_lessons PK_d170262016ad50cc0a5f99bc239; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelled_lessons
    ADD CONSTRAINT "PK_d170262016ad50cc0a5f99bc239" PRIMARY KEY (id);


--
-- Name: attendance PK_ee0ffe42c1f1a01e72b725c0cb2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "PK_ee0ffe42c1f1a01e72b725c0cb2" PRIMARY KEY (id);


--
-- Name: salary_settings PK_ef0271ad531d6459800c64e98d3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_settings
    ADD CONSTRAINT "PK_ef0271ad531d6459800c64e98d3" PRIMARY KEY (id);


--
-- Name: directions PK_f619ca47644a835bd091e8b9814; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT "PK_f619ca47644a835bd091e8b9814" PRIMARY KEY (id);


--
-- Name: students REL_e0208b4f964e609959aff431bf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "REL_e0208b4f964e609959aff431bf" UNIQUE ("userId");


--
-- Name: parents REL_f1e08daeefd9c2e5def5746be7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT "REL_f1e08daeefd9c2e5def5746be7" UNIQUE ("userId");


--
-- Name: students UQ_21d19ce21fb1f2ce83140407860; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "UQ_21d19ce21fb1f2ce83140407860" UNIQUE ("cardId");


--
-- Name: branches UQ_8387ed27b3d4ca53ec3fc7b029c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "UQ_8387ed27b3d4ca53ec3fc7b029c" UNIQUE (name);


--
-- Name: users UQ_a000cca60bcf04454e727699490; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE (phone);


--
-- Name: directions UQ_a6080721aab2adea433a8b8fde4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT "UQ_a6080721aab2adea433a8b8fde4" UNIQUE (name);


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: student_groups UQ_student_groups_student_group; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_groups
    ADD CONSTRAINT "UQ_student_groups_student_group" UNIQUE ("studentId", "groupId");


--
-- Name: homework_assignments homework_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_assignments
    ADD CONSTRAINT homework_assignments_pkey PRIMARY KEY (id);


--
-- Name: homework_submissions homework_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_pkey PRIMARY KEY (id);


--
-- Name: student_groups student_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_groups
    ADD CONSTRAINT student_groups_pkey PRIMARY KEY (id);


--
-- Name: support_availabilities support_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_availabilities
    ADD CONSTRAINT support_availabilities_pkey PRIMARY KEY (id);


--
-- Name: support_bookings support_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_bookings
    ADD CONSTRAINT support_bookings_pkey PRIMARY KEY (id);


--
-- Name: IDX_120e1c6edcec4f8221f467c803; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_120e1c6edcec4f8221f467c803" ON public.attendance USING btree ("studentId");


--
-- Name: IDX_246426dfd001466a1d5e47322f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_246426dfd001466a1d5e47322f" ON public.users USING btree ("branchId");


--
-- Name: IDX_2850e137c7fd27a745f6f6857c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_2850e137c7fd27a745f6f6857c" ON public.homework_submissions USING btree ("assignmentId");


--
-- Name: IDX_3d802bbcffd407a85b6e5a6075; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3d802bbcffd407a85b6e5a6075" ON public.groups USING btree ("branchId");


--
-- Name: IDX_53f3c5d0a99b4ce88b75efd1cd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_53f3c5d0a99b4ce88b75efd1cd" ON public.homework_submissions USING btree ("studentId");


--
-- Name: IDX_5618ade060df353e3965b75999; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5618ade060df353e3965b75999" ON public.user_activities USING btree ("userId");


--
-- Name: IDX_6aaef2f942d654b9e7c710a302; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6aaef2f942d654b9e7c710a302" ON public.test_results USING btree ("studentId");


--
-- Name: IDX_6b6fd86acbb2e2987ad8237b88; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6b6fd86acbb2e2987ad8237b88" ON public.notifications USING btree ("recipientId", "isRead");


--
-- Name: IDX_6fea943b3b432a9e3e38d53c31; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6fea943b3b432a9e3e38d53c31" ON public.students USING btree ("parentId");


--
-- Name: IDX_a4cfefb77be6e691c09b4f942f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_a4cfefb77be6e691c09b4f942f" ON public.points_logs USING btree ("studentId");


--
-- Name: IDX_ace513fa30d485cfd25c11a9e4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON public.users USING btree (role);


--
-- Name: IDX_b2731e10aef7f886a08c552290; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b2731e10aef7f886a08c552290" ON public.payments USING btree ("studentId");


--
-- Name: IDX_c2dba4746a161b806f9c969ccc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_c2dba4746a161b806f9c969ccc" ON public.test_results USING btree ("testId");


--
-- Name: IDX_cc296de36cadf8de53b9cd60aa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cc296de36cadf8de53b9cd60aa" ON public.students USING btree ("groupId");


--
-- Name: IDX_e63173ac43b478c2fc0cc20ac3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_e63173ac43b478c2fc0cc20ac3" ON public.groups USING btree ("teacherId");


--
-- Name: IDX_student_groups_groupId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_student_groups_groupId" ON public.student_groups USING btree ("groupId");


--
-- Name: IDX_student_groups_studentId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_student_groups_studentId" ON public.student_groups USING btree ("studentId");


--
-- Name: idx_attendance_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_student_id ON public.attendance USING btree ("studentId");


--
-- Name: idx_attendance_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_timestamp ON public.attendance USING btree ("timestamp" DESC);


--
-- Name: idx_support_avail_support_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_avail_support_date ON public.support_availabilities USING btree ("supportId", date);


--
-- Name: idx_support_booking_support_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_booking_support_date ON public.support_bookings USING btree ("supportId", date);


--
-- Name: payments FK_09739b0587054798a29e7eb17df; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_09739b0587054798a29e7eb17df" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: attendance FK_120e1c6edcec4f8221f467c8039; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "FK_120e1c6edcec4f8221f467c8039" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: test FK_15938435da04a14f3be0e98b5b0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test
    ADD CONSTRAINT "FK_15938435da04a14f3be0e98b5b0" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: coding_problem FK_162153512399ba8724ef55bd931; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_problem
    ADD CONSTRAINT "FK_162153512399ba8724ef55bd931" FOREIGN KEY ("testId") REFERENCES public.test(id) ON DELETE CASCADE;


--
-- Name: users FK_246426dfd001466a1d5e47322f4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_246426dfd001466a1d5e47322f4" FOREIGN KEY ("branchId") REFERENCES public.branches(id);


--
-- Name: homework_submissions FK_2850e137c7fd27a745f6f6857cc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT "FK_2850e137c7fd27a745f6f6857cc" FOREIGN KEY ("assignmentId") REFERENCES public.homework_assignments(id) ON DELETE CASCADE;


--
-- Name: question FK_2c8f911efa2fb5b0fe1abe92020; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT "FK_2c8f911efa2fb5b0fe1abe92020" FOREIGN KEY ("testId") REFERENCES public.test(id) ON DELETE CASCADE;


--
-- Name: test FK_326c61868a1cc89010e745c76b0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test
    ADD CONSTRAINT "FK_326c61868a1cc89010e745c76b0" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: homework_assignments FK_34acf46a93b59b41a88622ece7a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_assignments
    ADD CONSTRAINT "FK_34acf46a93b59b41a88622ece7a" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: users FK_43a9b10591b37f89df0b4e6a538; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_43a9b10591b37f89df0b4e6a538" FOREIGN KEY ("directionId") REFERENCES public.directions(id);


--
-- Name: homework_submissions FK_53f3c5d0a99b4ce88b75efd1cd9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT "FK_53f3c5d0a99b4ce88b75efd1cd9" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: user_activities FK_5618ade060df353e3965b759995; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT "FK_5618ade060df353e3965b759995" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: homework_assignments FK_5a32a166f1382c1d1b7e97a50e6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework_assignments
    ADD CONSTRAINT "FK_5a32a166f1382c1d1b7e97a50e6" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: groups FK_5bdd0eab540bb13c33c07a764ff; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT "FK_5bdd0eab540bb13c33c07a764ff" FOREIGN KEY ("directionId") REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: test_results FK_6aaef2f942d654b9e7c710a302d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_results
    ADD CONSTRAINT "FK_6aaef2f942d654b9e7c710a302d" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students FK_6fea943b3b432a9e3e38d53c31b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "FK_6fea943b3b432a9e3e38d53c31b" FOREIGN KEY ("parentId") REFERENCES public.parents(id) ON DELETE SET NULL;


--
-- Name: payments FK_8b8ddc119cf77e4a8968f47a703; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_8b8ddc119cf77e4a8968f47a703" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: groups FK_8d39b3406e17ed6ecc74da03f89; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT "FK_8d39b3406e17ed6ecc74da03f89" FOREIGN KEY ("supportId") REFERENCES public.users(id);


--
-- Name: cancelled_lessons FK_9f0b3a2c63d9d98a7e2b5211882; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelled_lessons
    ADD CONSTRAINT "FK_9f0b3a2c63d9d98a7e2b5211882" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: points_logs FK_a4cfefb77be6e691c09b4f942fd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_logs
    ADD CONSTRAINT "FK_a4cfefb77be6e691c09b4f942fd" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: payments FK_b2731e10aef7f886a08c552290e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_b2731e10aef7f886a08c552290e" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: coding_submissions FK_b998dbc8d1f8267d841704ed8d3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT "FK_b998dbc8d1f8267d841704ed8d3" FOREIGN KEY ("problemId") REFERENCES public.coding_problem(id) ON DELETE CASCADE;


--
-- Name: test_results FK_c2dba4746a161b806f9c969cccf; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_results
    ADD CONSTRAINT "FK_c2dba4746a161b806f9c969cccf" FOREIGN KEY ("testId") REFERENCES public.test(id) ON DELETE CASCADE;


--
-- Name: choices FK_c5164e6bff485bcfafcac9703d3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT "FK_c5164e6bff485bcfafcac9703d3" FOREIGN KEY ("questionId") REFERENCES public.question(id) ON DELETE CASCADE;


--
-- Name: students FK_cc296de36cadf8de53b9cd60aa7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "FK_cc296de36cadf8de53b9cd60aa7" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: notifications FK_db873ba9a123711a4bff527ccd5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_db873ba9a123711a4bff527ccd5" FOREIGN KEY ("recipientId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications FK_ddb7981cf939fe620179bfea33a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_ddb7981cf939fe620179bfea33a" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: test FK_dff26fc333622c5dea29d78f8be; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test
    ADD CONSTRAINT "FK_dff26fc333622c5dea29d78f8be" FOREIGN KEY ("directionId") REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: students FK_e0208b4f964e609959aff431bf9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "FK_e0208b4f964e609959aff431bf9" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups FK_e63173ac43b478c2fc0cc20ac39; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT "FK_e63173ac43b478c2fc0cc20ac39" FOREIGN KEY ("teacherId") REFERENCES public.users(id);


--
-- Name: coding_submissions FK_edaab4e685c4558e91839c56054; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT "FK_edaab4e685c4558e91839c56054" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: parents FK_f1e08daeefd9c2e5def5746be7e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT "FK_f1e08daeefd9c2e5def5746be7e" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: coding_submissions FK_f2f26e95900afe3a00f4ad23663; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT "FK_f2f26e95900afe3a00f4ad23663" FOREIGN KEY ("testResultId") REFERENCES public.test_results(id) ON DELETE CASCADE;


--
-- Name: cancelled_lessons FK_f6e3816fbaf3acd9612b7a58534; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelled_lessons
    ADD CONSTRAINT "FK_f6e3816fbaf3acd9612b7a58534" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: student_groups FK_student_groups_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_groups
    ADD CONSTRAINT "FK_student_groups_group" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: student_groups FK_student_groups_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_groups
    ADD CONSTRAINT "FK_student_groups_student" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: support_availabilities fk_support_avail_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_availabilities
    ADD CONSTRAINT fk_support_avail_user FOREIGN KEY ("supportId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_bookings fk_support_booking_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_bookings
    ADD CONSTRAINT fk_support_booking_student FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: support_bookings fk_support_booking_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_bookings
    ADD CONSTRAINT fk_support_booking_user FOREIGN KEY ("supportId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict bMcnHPqcANYuuOPqiQG7kOl1wQlyMILiaxxH1yfFKkpN7mFgCPvvhDU38DNumX7

