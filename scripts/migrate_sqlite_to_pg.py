import sqlite3
import json
import urllib.request
import urllib.error
import os

SQLITE_DB_PATH = r"D:\MYPRO\PZHR\pzhr.db"
API_URL = "http://localhost:3000/api/import"

TABLES_IN_ORDER = [
    "locations",
    "pay_scales",
    "designations",
    "posts",
    "app_settings",
    "users",
    "employees",
    "promotion_history",
    "transfer_history",
    "seniority_override",
    "leave_records"
]

def get_db_connection():
    if not os.path.exists(SQLITE_DB_PATH):
        raise FileNotFoundError(f"SQLite database not found at: {SQLITE_DB_PATH}")
    return sqlite3.connect(SQLITE_DB_PATH)

def post_records(table_name, records):
    payload = {
        "table": table_name,
        "records": records
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        API_URL, 
        data=data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            res_json = json.loads(res_data)
            return res_json
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        clean_error = error_msg.encode('ascii', 'ignore').decode('ascii')
        print(f"HTTP Error {e.code} for {table_name}: {clean_error}")
        return {"success": False, "error": error_msg}
    except Exception as e:
        clean_error = str(e).encode('ascii', 'ignore').decode('ascii')
        print(f"Connection failed for {table_name}: {clean_error}")
        return {"success": False, "error": str(e)}

def migrate_table(conn, table_name):
    print(f"\nMigrating table '{table_name}'...")
    cur = conn.cursor()
    
    try:
        cur.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cur.fetchall()]
        
        cur.execute(f"SELECT * FROM {table_name}")
        rows = cur.fetchall()
        
        total_rows = len(rows)
        print(f"  Found {total_rows} records in SQLite.")
        
        if total_rows == 0:
            print("  Skipping (empty table).")
            return True
            
        # Convert tuples to dicts
        records = []
        for row in rows:
            record = {}
            for col_idx, col_name in enumerate(columns):
                val = row[col_idx]
                record[col_name] = val
            records.append(record)
            
        # Send in batches of 400 to prevent large payload sizes
        batch_size = 400
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            print(f"  Sending batch {i//batch_size + 1} ({len(batch)} records)...")
            res = post_records(table_name, batch)
            if not res.get("success"):
                err_text = str(res.get('error')).encode('ascii', 'ignore').decode('ascii')
                print(f"  [FAIL] Failed to migrate batch for {table_name}: {err_text}")
                return False
                
        print(f"  [OK] Table '{table_name}' migrated successfully.")
        return True
        
    except Exception as e:
        err_text = str(e).encode('ascii', 'ignore').decode('ascii')
        print(f"  [ERROR] Error migrating table '{table_name}': {err_text}")
        return False

def main():
    print("="*60)
    print("PZHR SQLite to PostgreSQL Database Migration Script")
    print("="*60)
    
    try:
        print("Clearing all tables in PostgreSQL database...")
        clear_res = post_records("clear_all", [])
        if not clear_res.get("success"):
            err_text = str(clear_res.get('error')).encode('ascii', 'ignore').decode('ascii')
            print(f"[FAIL] Failed to clear database: {err_text}")
            return
        print("[OK] PostgreSQL database tables successfully cleared!")

        conn = get_db_connection()
        print(f"Successfully connected to SQLite: {SQLITE_DB_PATH}")
        
        success_count = 0
        for table in TABLES_IN_ORDER:
            if migrate_table(conn, table):
                success_count += 1
            else:
                print(f"\nMigration halted due to error in table '{table}'.")
                break
                
        conn.close()
        
        print("\n" + "="*60)
        if success_count == len(TABLES_IN_ORDER):
            print("=== ALL TABLES MIGRATED SUCCESSFULLY! ===")
        else:
            print("[WARNING] Migration incomplete due to errors.")
        print("="*60)
        
    except Exception as e:
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    main()
