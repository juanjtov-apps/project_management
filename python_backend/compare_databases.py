"""
Database Schema Comparison Script
Compares DEV and PROD database schemas to identify differences before deployment
"""

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables
load_dotenv()

DATABASE_URL_DEV = os.getenv("DATABASE_URL_DEV")
DATABASE_URL_PROD = os.getenv("DATABASE_URL_PROD")

if not DATABASE_URL_DEV:
    raise ValueError("DATABASE_URL_DEV is required")
if not DATABASE_URL_PROD:
    raise ValueError("DATABASE_URL_PROD is required")


async def get_tables(conn):
    """Get all tables in the public schema"""
    query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """
    rows = await conn.fetch(query)
    return {row['table_name'] for row in rows}


async def get_columns(conn, table_name):
    """Get all columns for a table with their details"""
    query = """
        SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position
    """
    rows = await conn.fetch(query, table_name)
    return {row['column_name']: dict(row) for row in rows}


async def get_indexes(conn, table_name):
    """Get all indexes for a table"""
    query = """
        SELECT
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = $1
        ORDER BY indexname
    """
    rows = await conn.fetch(query, table_name)
    return {row['indexname']: row['indexdef'] for row in rows}


async def get_constraints(conn, table_name):
    """Get all constraints for a table"""
    query = """
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        ORDER BY tc.constraint_name
    """
    rows = await conn.fetch(query, table_name)
    constraints = defaultdict(dict)
    for row in rows:
        name = row['constraint_name']
        constraints[name] = {
            'type': row['constraint_type'],
            'column': row['column_name'],
            'foreign_table': row['foreign_table_name'],
            'foreign_column': row['foreign_column_name']
        }
    return dict(constraints)


async def compare_schemas():
    """Main comparison function"""
    print("=" * 80)
    print("DATABASE SCHEMA COMPARISON: DEV vs PROD")
    print("=" * 80)

    # Connect to both databases
    print("\nConnecting to databases...")
    try:
        dev_conn = await asyncpg.connect(DATABASE_URL_DEV, ssl='require')
        print("✅ Connected to DEV database")
    except Exception as e:
        print(f"❌ Failed to connect to DEV database: {e}")
        return

    try:
        prod_conn = await asyncpg.connect(DATABASE_URL_PROD, ssl='require')
        print("✅ Connected to PROD database")
    except Exception as e:
        print(f"❌ Failed to connect to PROD database: {e}")
        await dev_conn.close()
        return

    try:
        # Get database info
        dev_version = await dev_conn.fetchval("SELECT version()")
        prod_version = await prod_conn.fetchval("SELECT version()")
        print(f"\nDEV PostgreSQL: {dev_version.split(',')[0]}")
        print(f"PROD PostgreSQL: {prod_version.split(',')[0]}")

        # Get tables
        print("\n" + "=" * 80)
        print("TABLES COMPARISON")
        print("=" * 80)

        dev_tables = await get_tables(dev_conn)
        prod_tables = await get_tables(prod_conn)

        tables_only_in_dev = dev_tables - prod_tables
        tables_only_in_prod = prod_tables - dev_tables
        common_tables = dev_tables & prod_tables

        if tables_only_in_dev:
            print(f"\n🔴 TABLES ONLY IN DEV ({len(tables_only_in_dev)}):")
            for table in sorted(tables_only_in_dev):
                print(f"   - {table}")

        if tables_only_in_prod:
            print(f"\n🟠 TABLES ONLY IN PROD ({len(tables_only_in_prod)}):")
            for table in sorted(tables_only_in_prod):
                print(f"   - {table}")

        if not tables_only_in_dev and not tables_only_in_prod:
            print("\n✅ All tables exist in both databases")

        print(f"\n📊 Summary: DEV has {len(dev_tables)} tables, PROD has {len(prod_tables)} tables")
        print(f"   Common tables: {len(common_tables)}")

        # Compare columns for common tables
        print("\n" + "=" * 80)
        print("COLUMN DIFFERENCES IN COMMON TABLES")
        print("=" * 80)

        column_diffs = []

        for table in sorted(common_tables):
            dev_columns = await get_columns(dev_conn, table)
            prod_columns = await get_columns(prod_conn, table)

            dev_col_names = set(dev_columns.keys())
            prod_col_names = set(prod_columns.keys())

            cols_only_in_dev = dev_col_names - prod_col_names
            cols_only_in_prod = prod_col_names - dev_col_names
            common_cols = dev_col_names & prod_col_names

            # Check for type differences in common columns
            type_diffs = []
            for col in common_cols:
                dev_col = dev_columns[col]
                prod_col = prod_columns[col]

                # Compare data type and nullable
                if (dev_col['data_type'] != prod_col['data_type'] or
                    dev_col['is_nullable'] != prod_col['is_nullable'] or
                    dev_col['udt_name'] != prod_col['udt_name']):
                    type_diffs.append({
                        'column': col,
                        'dev': f"{dev_col['udt_name']} (nullable: {dev_col['is_nullable']})",
                        'prod': f"{prod_col['udt_name']} (nullable: {prod_col['is_nullable']})"
                    })

            if cols_only_in_dev or cols_only_in_prod or type_diffs:
                column_diffs.append({
                    'table': table,
                    'only_in_dev': cols_only_in_dev,
                    'only_in_prod': cols_only_in_prod,
                    'type_diffs': type_diffs
                })

        if column_diffs:
            for diff in column_diffs:
                print(f"\n📋 Table: {diff['table']}")
                if diff['only_in_dev']:
                    print(f"   🔴 Columns only in DEV:")
                    for col in sorted(diff['only_in_dev']):
                        print(f"      - {col}")
                if diff['only_in_prod']:
                    print(f"   🟠 Columns only in PROD:")
                    for col in sorted(diff['only_in_prod']):
                        print(f"      - {col}")
                if diff['type_diffs']:
                    print(f"   ⚠️  Type differences:")
                    for td in diff['type_diffs']:
                        print(f"      - {td['column']}")
                        print(f"        DEV:  {td['dev']}")
                        print(f"        PROD: {td['prod']}")
        else:
            print("\n✅ All columns match in common tables")

        # Compare indexes
        print("\n" + "=" * 80)
        print("INDEX DIFFERENCES")
        print("=" * 80)

        index_diffs = []

        for table in sorted(common_tables):
            dev_indexes = await get_indexes(dev_conn, table)
            prod_indexes = await get_indexes(prod_conn, table)

            dev_idx_names = set(dev_indexes.keys())
            prod_idx_names = set(prod_indexes.keys())

            idx_only_in_dev = dev_idx_names - prod_idx_names
            idx_only_in_prod = prod_idx_names - dev_idx_names

            if idx_only_in_dev or idx_only_in_prod:
                index_diffs.append({
                    'table': table,
                    'only_in_dev': {k: dev_indexes[k] for k in idx_only_in_dev},
                    'only_in_prod': {k: prod_indexes[k] for k in idx_only_in_prod}
                })

        if index_diffs:
            for diff in index_diffs:
                print(f"\n📋 Table: {diff['table']}")
                if diff['only_in_dev']:
                    print(f"   🔴 Indexes only in DEV:")
                    for idx_name, idx_def in diff['only_in_dev'].items():
                        print(f"      - {idx_name}")
                if diff['only_in_prod']:
                    print(f"   🟠 Indexes only in PROD:")
                    for idx_name, idx_def in diff['only_in_prod'].items():
                        print(f"      - {idx_name}")
        else:
            print("\n✅ All indexes match in common tables")

        # Generate migration SQL for missing items in PROD
        print("\n" + "=" * 80)
        print("MIGRATION SQL (to sync PROD with DEV)")
        print("=" * 80)

        has_migrations = False

        # Tables to create in PROD
        if tables_only_in_dev:
            has_migrations = True
            print("\n-- Tables to create in PROD:")
            print("-- (Full CREATE TABLE statements need to be generated manually)")
            for table in sorted(tables_only_in_dev):
                print(f"-- CREATE TABLE {table} (...);")
                # Get column info for guidance
                dev_columns = await get_columns(dev_conn, table)
                print(f"--   Columns: {', '.join(dev_columns.keys())}")

        # Columns to add in PROD
        for diff in column_diffs:
            if diff['only_in_dev']:
                has_migrations = True
                print(f"\n-- Columns to add to {diff['table']} in PROD:")
                dev_columns = await get_columns(dev_conn, diff['table'])
                for col in sorted(diff['only_in_dev']):
                    col_info = dev_columns[col]
                    nullable = "NULL" if col_info['is_nullable'] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col_info['column_default']}" if col_info['column_default'] else ""
                    print(f"ALTER TABLE {diff['table']} ADD COLUMN {col} {col_info['udt_name']} {nullable}{default};")

        # Indexes to create in PROD
        for diff in index_diffs:
            if diff['only_in_dev']:
                has_migrations = True
                print(f"\n-- Indexes to create on {diff['table']} in PROD:")
                for idx_name, idx_def in diff['only_in_dev'].items():
                    # Skip pkey indexes - they're created with the table
                    if '_pkey' not in idx_name:
                        print(f"{idx_def};")

        if not has_migrations:
            print("\n✅ No migrations needed - databases are in sync!")

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        total_issues = (
            len(tables_only_in_dev) +
            len(tables_only_in_prod) +
            sum(len(d['only_in_dev']) + len(d['only_in_prod']) + len(d['type_diffs']) for d in column_diffs) +
            sum(len(d['only_in_dev']) + len(d['only_in_prod']) for d in index_diffs)
        )

        if total_issues == 0:
            print("\n✅ Databases are fully synchronized!")
        else:
            print(f"\n⚠️  Found {total_issues} differences that need attention before deployment")
            print("\nRecommendation: Apply the migration SQL above to PROD before deploying.")

    finally:
        await dev_conn.close()
        await prod_conn.close()
        print("\n\nDatabase connections closed.")


if __name__ == "__main__":
    asyncio.run(compare_schemas())
