ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_hospitalId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_immutable_guard"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
