import os
import re

def fix_imports_and_barrels(project_dir):
    features_dir = os.path.join(project_dir, 'features')
    app_dir = os.path.join(project_dir, 'app')
    
    # 1. Find all restricted imports across all .tsx and .ts files
    import_pattern = re.compile(r'import\s+(?:{[^}]+}|\w+)\s+from\s+["\']@/features/([^/]+)/([^"\']+)["\'];?')
    
    files_to_check = []
    for root_dir in [app_dir, features_dir, os.path.join(project_dir, 'types')]:
        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.endswith('.ts') or file.endswith('.tsx'):
                    files_to_check.append(os.path.join(root, file))
                    
    exports_to_add = {} # feature_name -> set of relative paths to export
    
    for filepath in files_to_check:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified = False
        
        def replacer(match):
            feature_name = match.group(1)
            internal_path = match.group(2) # e.g. components/chart-container
            
            # Record what needs to be exported from the feature's barrel
            if feature_name not in exports_to_add:
                exports_to_add[feature_name] = set()
            exports_to_add[feature_name].add(internal_path)
            
            # Rewrite import
            return match.group(0).replace(f'@/features/{feature_name}/{internal_path}', f'@/features/{feature_name}')
            
        new_content, count = import_pattern.subn(replacer, content)
        
        if count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {count} imports in {filepath}")
            
    # 2. Update or create barrel files for each feature
    for feature_name, internal_paths in exports_to_add.items():
        barrel_path = os.path.join(features_dir, feature_name, 'index.ts')
        
        existing_exports = set()
        if os.path.exists(barrel_path):
            with open(barrel_path, 'r', encoding='utf-8') as f:
                existing_exports = set(f.read().splitlines())
        else:
            os.makedirs(os.path.dirname(barrel_path), exist_ok=True)
            
        new_exports = existing_exports.copy()
        for internal_path in internal_paths:
            # Drop the file extension if any
            clean_path = internal_path
            if clean_path.endswith('.ts') or clean_path.endswith('.tsx'):
                clean_path = clean_path.rsplit('.', 1)[0]
            
            export_line = f'export * from "./{clean_path}";'
            new_exports.add(export_line)
            
        with open(barrel_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sorted(new_exports)) + '\n')
        print(f"Updated barrel file for {feature_name} with {len(new_exports)} exports.")

if __name__ == "__main__":
    fix_imports_and_barrels('/home/mohal665544/pr1/company-dashboard')
