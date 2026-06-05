import json

input_path = '/home/mohal665544/.gemini/antigravity-ide/brain/45f2c0f1-9692-49b9-86b0-a9e771cac381/.system_generated/steps/162/output.txt'

with open(input_path, 'r') as f:
    data = json.load(f)

text = data['result']
start_marker = "<untrusted-data-f96a8190-8146-4a25-8726-8bd2ed9acaef>\n"
end_marker = "\n</untrusted-data-f96a8190-8146-4a25-8726-8bd2ed9acaef>"

start_idx = text.find(start_marker) + len(start_marker)
end_idx = text.find(end_marker)
json_str = text[start_idx:end_idx]
policies = json.loads(json_str)

tables = set([p['tablename'] for p in policies])

out_sql = "\n\n-- Final Advisor Fixes for GraphQL exposed tables\n"

for t in tables:
    out_sql += f"COMMENT ON TABLE public.\"{t}\" IS '@graphql({{\"exclude\": true}})';\n"

out_sql += "\n-- Final Advisor Fixes for Functions\n"
out_sql += "ALTER FUNCTION public.block_audit_mutation_trigger() SET search_path = '';\n"
out_sql += "ALTER FUNCTION public.get_current_company_id() SET search_path = '';\n"
out_sql += "ALTER FUNCTION public.is_super_admin(uuid) SET search_path = '';\n"
out_sql += "ALTER FUNCTION public.is_platform_admin_user(uuid) SET search_path = '';\n"

out_sql += "\n-- Final Advisor Fixes for Buckets\n"
out_sql += "DROP POLICY IF EXISTS \"Public Access for branding_assets\" ON storage.objects;\n"
out_sql += "DROP POLICY IF EXISTS \"Public Access\" ON storage.objects;\n"

with open('/home/mohal665544/pr1/scratch/out.sql', 'a') as f:
    f.write(out_sql)
