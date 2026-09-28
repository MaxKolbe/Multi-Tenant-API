CREATE TABLE "references" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"int" integer,
	"int1" integer DEFAULT 10,
	"int2" integer NOT NULL,
	"boolean" boolean,
	"text1" text NOT NULL,
	"text2" text,
	"varchar1" varchar,
	"varchar2" varchar(256),
	"char1" char,
	"char2" char(256),
	"numeric1" numeric,
	"numeric2" numeric(100),
	"numeric3" numeric(100, 20),
	"json1" json,
	"json2" json DEFAULT '{"foo":"bar"}'::json,
	"jsonb1" jsonb,
	"jsonb2" jsonb DEFAULT '{"foo":"bar"}'::jsonb,
	"uuid1" uuid,
	"uuid2" uuid DEFAULT gen_random_uuid(),
	"time1" time,
	"date" date,
	"numberArray" numeric[],
	"stringArray1" text[],
	"unique" text,
	"stringArray2" text[] NOT NULL,
	"timestamp1" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "references_unique_unique" UNIQUE("unique")
);
--> statement-breakpoint
CREATE INDEX "example_idx" ON "references" USING btree ("text2");--> statement-breakpoint
CREATE INDEX "example_search_index" ON "references" USING gin ((
        setweight(to_tsvector('english', "text1"), 'A') ||
        setweight(to_tsvector('english', coalesce("text2", '')), 'B') ||
        setweight(array_to_tsvector(coalesce("stringArray1", ARRAY[]::text[])), 'C') ||
        setweight(to_tsvector('english', coalesce("numeric1"::text, '')), 'D') 
      ));