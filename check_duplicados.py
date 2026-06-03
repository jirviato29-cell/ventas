import pandas as pd
import psycopg2
from datetime import date

DB_PARAMS = {
    "host": "aws-0-us-east-1.pooler.supabase.com",
    "port": 6543,
    "dbname": "postgres",
    "user": "postgres.xndwjuipxrmzwylpwxvw",
    "password": "Mateo1202@29",
    "sslmode": "require",
}

# 1. Leer Excel
excel_path = r"C:\Users\Administrador\Desktop\MACHOTE_comisiones_telcel.xlsx"
df = pd.read_excel(excel_path)
print(f"Filas en Excel: {len(df)}")
print(f"Columnas: {list(df.columns)}")

# Normalizar columnas
df.columns = [c.strip().lower() for c in df.columns]
df["numero"] = df["numero"].astype(str).str.strip()
df["fecha"] = pd.to_datetime(df["fecha"]).dt.date

fecha_min = df["fecha"].min()
fecha_max = df["fecha"].max()
print(f"Rango de fechas: {fecha_min} a {fecha_max}")

# 2. Traer pares existentes de Supabase
conn = psycopg2.connect(**DB_PARAMS)
query = """
    SELECT numero::text, fecha
    FROM comisiones_telcel
    WHERE fecha BETWEEN %s AND %s
"""
db_df = pd.read_sql(query, conn, params=(fecha_min, fecha_max))
conn.close()

db_df["numero"] = db_df["numero"].astype(str).str.strip()
db_df["fecha"] = pd.to_datetime(db_df["fecha"]).dt.date
print(f"Pares en BD (mismo rango): {len(db_df)}")

# 3. Cruzar
df["_key"] = df["numero"] + "_" + df["fecha"].astype(str)
db_df["_key"] = db_df["numero"] + "_" + db_df["fecha"].astype(str)

existentes = df["_key"].isin(db_df["_key"])
duplicados = existentes.sum()
nuevos = (~existentes).sum()

print(f"\n{'='*40}")
print(f"DUPLICADOS (ya en BD): {duplicados}")
print(f"NUEVOS (no en BD):     {nuevos}")
print(f"{'='*40}")

# 4. Generar Excel solo con nuevos
df_nuevos = df[~existentes].drop(columns=["_key"])
out_path = r"C:\Users\Administrador\Desktop\comisiones_telcel_NUEVOS.xlsx"
df_nuevos.to_excel(out_path, index=False)
print(f"\nArchivo generado: {out_path}")
