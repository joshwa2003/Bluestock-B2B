import pandas as pd
import os

# 1. Path where you just moved the files
folder_path = 'data'
master_list = []

print("🚀 Starting the Master Cleaning Process...")

# 2. Loop through every file in the 'data' folder
for filename in os.listdir(folder_path):
    if filename.endswith(".xls"):
        try:
            file_path = os.path.join(folder_path, filename)
            
            # Read the Excel file
            df = pd.read_excel(file_path)
            
            # CLEANING: Keep only rows where MDDS PLCN is NOT 0
            # 0 means it is a State/District Total. We only want villages.
            if 'MDDS PLCN' in df.columns:
                cleaned_df = df[df['MDDS PLCN'] > 0]
                master_list.append(cleaned_df)
                print(f"✅ Cleaned: {filename}")
            else:
                print(f"⚠️ Skipping {filename}: Column 'MDDS PLCN' not found.")
                
        except Exception as e:
            print(f"❌ Error in {filename}: {e}")

# 3. Combine all files into ONE master list
if master_list:
    final_data = pd.concat(master_list, ignore_index=True)
    final_data.to_csv('master_villages.csv', index=False)
    print("\n" + "="*30)
    print(f"🏆 DONE! Total Villages Found: {len(final_data)}")
    print("Created one clean file: master_villages.csv")
    print("="*30)
else:
    print("No files were processed. Double check your 'data' folder!")