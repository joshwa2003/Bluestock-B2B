import pandas as pd
import psycopg2
from psycopg2 import extras
import os

# Connection Details
DB_URL = "postgresql://neondb_owner:npg_bAiz7Pdg0xfJ@ep-muddy-leaf-anb48w0v.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"

def run_import():
    try:
        print("📖 Reading master_villages.csv...")
        df = pd.read_csv('master_villages.csv', dtype=str)
        df = df.fillna("N/A")

        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        # --- STEP 1: COUNTRY ---
        cur.execute("INSERT INTO \"Country\" (name) VALUES ('India') ON CONFLICT DO NOTHING")
        cur.execute("SELECT id FROM \"Country\" LIMIT 1")
        country_id = cur.fetchone()[0]

        # --- STEP 2: STATES ---
        print("⚡ Fast Mapping States...")
        states = df[['MDDS STC', 'STATE NAME']].drop_duplicates()
        state_data = []
        for _, row in states.iterrows():
            if str(row['MDDS STC']).strip() in ['N/A', 'nan']: continue
            state_data.append((int(float(row['MDDS STC'])), row['STATE NAME'], country_id))
            
        extras.execute_values(cur, "INSERT INTO \"State\" (code, name, \"countryId\") VALUES %s ON CONFLICT (code) DO NOTHING", state_data, page_size=5000)
        conn.commit()

        cur.execute("SELECT code, id FROM \"State\"")
        state_map = dict(cur.fetchall())

        # --- STEP 3: DISTRICTS ---
        print("⚡ Fast Mapping Districts...")
        districts = df[['MDDS DTC', 'DISTRICT NAME', 'MDDS STC']].drop_duplicates()
        district_data = []
        for _, row in districts.iterrows():
            if str(row['MDDS DTC']).strip() in ['N/A', 'nan'] or str(row['MDDS STC']).strip() in ['N/A', 'nan']: continue
            s_code = int(float(row['MDDS STC']))
            if s_code in state_map:
                district_data.append((int(float(row['MDDS DTC'])), row['DISTRICT NAME'], state_map[s_code]))
                
        extras.execute_values(cur, "INSERT INTO \"District\" (code, name, \"stateId\") VALUES %s ON CONFLICT (code) DO NOTHING", district_data, page_size=5000)
        conn.commit()

        cur.execute("SELECT code, id FROM \"District\"")
        district_map = dict(cur.fetchall())

        # --- STEP 4: SUB-DISTRICTS ---
        print("⚡ Fast Mapping Sub-Districts...")
        sub_districts = df[['MDDS Sub_DT', 'SUB-DISTRICT NAME', 'MDDS DTC']].drop_duplicates()
        sd_data = []
        for _, row in sub_districts.iterrows():
            if str(row['MDDS Sub_DT']).strip() in ['N/A', 'nan'] or str(row['MDDS DTC']).strip() in ['N/A', 'nan']: continue
            d_code = int(float(row['MDDS DTC']))
            if d_code in district_map:
                sd_data.append((int(float(row['MDDS Sub_DT'])), row['SUB-DISTRICT NAME'], district_map[d_code]))

        extras.execute_values(cur, "INSERT INTO \"SubDistrict\" (code, name, \"districtId\") VALUES %s ON CONFLICT (code) DO NOTHING", sd_data, page_size=5000)
        conn.commit()

        cur.execute("SELECT code, id FROM \"SubDistrict\"")
        sd_map = dict(cur.fetchall())

        # --- STEP 5: VILLAGES (Batch Insert) ---
        print("⚡ Final Step: Importing Villages (Batching 600,000+ rows)...")
        village_data = []
        for _, row in df.iterrows():
            if str(row['MDDS PLCN']).strip() in ['N/A', 'nan'] or str(row['MDDS Sub_DT']).strip() in ['N/A', 'nan']: continue
            sd_code = int(float(row['MDDS Sub_DT']))
            if sd_code in sd_map:
                village_data.append((int(float(row['MDDS PLCN'])), row['Area Name'], sd_map[sd_code]))

        extras.execute_values(cur, "INSERT INTO \"Village\" (code, name, \"subDistrictId\") VALUES %s ON CONFLICT (code) DO NOTHING", village_data, page_size=10000)
        conn.commit()
        
        print(f"🏆 SUCCESS! All data is imported to NeonDB.")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    run_import()
