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

out_sql = "-- Final Advisor Fixes for RLS\n"

for p in policies:
    table = p['tablename']
    name = p['policyname']
    cmd = p['cmd']
    qual = p['qual']
    with_check = p['with_check']
    
    out_sql += f'DROP POLICY IF EXISTS "{name}" ON public."{table}";\n'
    
    new_qual = qual.replace("auth.uid()", "(select auth.uid())").replace("auth.jwt()", "(select auth.jwt())") if qual else None
    new_check = with_check.replace("auth.uid()", "(select auth.uid())").replace("auth.jwt()", "(select auth.jwt())") if with_check else None
    
    if cmd == 'ALL':
        out_sql += f'CREATE POLICY "{name}" ON public."{table}" FOR ALL'
        if new_qual: out_sql += f' USING ({new_qual})'
        if new_check: out_sql += f' WITH CHECK ({new_check})'
        out_sql += ';\n'
    else:
        out_sql += f'CREATE POLICY "{name}" ON public."{table}" FOR {cmd}'
        if new_qual: out_sql += f' USING ({new_qual})'
        if new_check: out_sql += f' WITH CHECK ({new_check})'
        out_sql += ';\n'

print(out_sql)
