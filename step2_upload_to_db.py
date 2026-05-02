import pandas as pd
import mysql.connector

# 1. Load data
print("📖 Reading master_villages.csv...")
df = pd.read_csv('master_villages.csv')

# --- THE FIX: Handle blanks based on data type ---
# Fill missing Names with "N/A"
text_columns = ['STATE NAME', 'DISTRICT NAME', 'SUB-DISTRICT NAME', 'Area Name']
df[text_columns] = df[text_columns].fillna("N/A")

# Fill missing Codes with 0
code_columns = ['MDDS STC', 'MDDS DTC', 'MDDS Sub_DT', 'MDDS PLCN']
df[code_columns] = df[code_columns].fillna(0)
# ------------------------------------------------

print(f"📊 Loaded {len(df)} rows. Preparing for upload...")

try:
    # 2. Connect to MySQL
    conn = mysql.connector.connect(
        host='127.0.0.1',
        user='root',
        password='joshwa001', # <--- Put your password here if you set one
        database='village_db'
    )
    cursor = conn.cursor()
    
    # 3. Clear the table
    print("Sweep 🧹: Clearing the table for a fresh start...")
    cursor.execute("TRUNCATE TABLE villages")
    
    # 4. SQL Query
    sql = """INSERT INTO villages (state_code, state_name, district_code, 
             district_name, sub_district_code, sub_district_name, 
             village_code, village_name) 
             VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""

    # 5. Convert to List of Tuples
    records = [tuple(x) for x in df[['MDDS STC', 'STATE NAME', 'MDDS DTC', 
                                    'DISTRICT NAME', 'MDDS Sub_DT', 'SUB-DISTRICT NAME', 
                                    'MDDS PLCN', 'Area Name']].values]

    # 6. Batch Insert
    print("🚀 Starting Batch Upload...")
    batch_size = 5000
    for i in range(0, len(records), batch_size):
        chunk = records[i:i + batch_size]
        cursor.executemany(sql, chunk)
        conn.commit()
        
        progress = min(i + batch_size, len(records))
        print(f"📡 Progress: {progress} / {len(records)} villages uploaded...")

    print("\n" + "="*40)
    print(f"🏆 SUCCESS! All {len(df)} villages are now in MySQL.")
    print("="*40)

except Exception as e:
    print(f"❌ Critical Error: {e}")

finally:
    if conn.is_connected():
        cursor.close()
        conn.close()
        print("🔒 Database connection closed.")