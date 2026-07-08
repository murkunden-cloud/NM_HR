import pandas as pd
import sys

def calculate_allowance(emp_no):
    # Load Master Employee Data
    try:
        df_emp = pd.read_excel('D:\\MYPRO\\pzhr_web\\master_emp.xlsx')
    except Exception as e:
        print(f"Error loading master_emp.xlsx: {e}")
        return

    # Find the employee
    emp = df_emp[df_emp['empno'] == int(emp_no)]
    if emp.empty:
        print(f"Employee {emp_no} not found.")
        return

    emp_data = emp.iloc[0]
    desig = str(emp_data['desigz']).strip()
    paygrp = emp_data['paygrp']
    
    print("====================================")
    print(f"EMPLOYEE DETAILS:")
    print(f"ID: {emp_data['empno']}")
    print(f"Name: {emp_data['empnm']}")
    print(f"Designation: {desig}")
    print(f"Pay Group: {paygrp}")
    print("====================================")

    # Load Extracted Allowances Data
    try:
        df_gen = pd.read_excel('D:\\MYPRO\\pzhr_web\\allowances_mapping_extracted.xlsx', sheet_name='General Allowances')
        df_admin = pd.read_excel('D:\\MYPRO\\pzhr_web\\allowances_mapping_extracted.xlsx', sheet_name='Fringe Admin (1192)')
        df_field = pd.read_excel('D:\\MYPRO\\pzhr_web\\allowances_mapping_extracted.xlsx', sheet_name='Fringe Field (1191)')
    except Exception as e:
        print(f"Error loading extracted allowances: {e}")
        return

    # Designation Mapping Dictionary
    # This maps the short forms / specific designations in master data 
    # to the grouped categories mentioned in the Circulars
    desig_mapping = {
        'Junior Engineer': 'Junior Engineer and Equivalent',
        'Jr.Eng(Distribution)': 'Junior Engineer and Equivalent',
        'Jr.Eng(Civil)': 'Junior Engineer and Equivalent',
        'Asst Engineer': 'Assistant Engineer and Equivalent',
        'Asst.E(Distribution)': 'Assistant Engineer and Equivalent',
        'Asst. Eng(Civil)': 'Assistant Engineer and Equivalent',
        'Deputy Manager(HR)': 'Deputy Manager (HR & F&A) and Equivalent',
        'Dy Mgr(F & A)': 'Deputy Manager (HR & F&A) and Equivalent',
        'EE(Distribution)': 'Executive Engineer and equivalent',
        'EE(Civil)': 'Executive Engineer and equivalent',
        'Dy EE(Distribution)': 'Deputy Executive Engineer and Equivalent',
        'Dy EE(Civil)': 'Deputy Executive Engineer and Equivalent',
        'Technician': 'Technician and Equivalent',
        'Senior Technician': 'Senior Technician and Equivalent',
        'Chief Technician': 'Chief Technician / Technician B and Equivalent',
        'Principal Technician': 'Principal Technician C & Equivalent',
        'HdClk/SrClk/EstbAsst': 'Head Clerk/Assistant Accountant and Equivalent',
        'Assistant Accountant': 'Head Clerk/Assistant Accountant and Equivalent',
        'Add.EE(Distribution)': 'Additional Executive Engineer and Equivalent',
        'Add. EE(Civil)': 'Additional Executive Engineer and Equivalent',
        'Manager(HR)': 'Senior Manager (HR) and Equivalent', # Or Manager (F&A) depending on mapping
        'S.E(Distribution)': 'Superintending Engineer and equivalent',
        'SE. (Civil)': 'Superintending Engineer and equivalent',
        'C.E (Distribution)': 'Chief Engineer and equivalent',
        'Chief Eng.(Training)': 'Chief Engineer and equivalent',
        'Chief Eng.(Civil)': 'Chief Engineer and equivalent',
    }

    mapped_category = desig_mapping.get(desig, desig)
    print(f"Mapped Category for Circular matching: '{mapped_category}'\n")
    
    print("ELIGIBLE ALLOWANCES:")
    print(f"{'Allowance Type':<40} | {'Wage Code':<10} | {'Amount (Rs.)':<12}")
    print("-" * 70)
    
    total_allowance = 0

    # 1. Check General Allowances by Pay Group
    for index, row in df_gen.iterrows():
        # Some general allowances apply broadly by pay group
        if pd.notna(row['Pay Group']) and row['Pay Group'] == paygrp:
            print(f"{row['Allowance Name']:<40} | {row['Wage Type Code']:<10} | {row['Amount (Rs.)']:<12}")
            try:
                total_allowance += float(row['Amount (Rs.)'])
            except:
                pass

    # 2. Check Fringe Benefits (Admin) by Designation
    admin_match = df_admin[df_admin['Category'] == mapped_category]
    if not admin_match.empty:
        for col in ['Energy/Elec.Sup (Rs)', 'Typing (Rs)', 'Punch Optr (Rs)', 'Cash (Rs)', 'Store (Rs)']:
            val = admin_match.iloc[0][col]
            if pd.notna(val):
                print(f"Fringe Admin: {col.replace(' (Rs)',''):<26} | 1192       | {val:<12}")
                total_allowance += float(val)

    # 3. Check Fringe Benefits (Field) by Designation
    field_match = df_field[df_field['Category'] == mapped_category]
    if not field_match.empty:
        for col in ['SCA-II/PJTA-II (Rs)', 'Field (Rs)', 'Store (Rs)', 'Training (Rs)']:
            val = field_match.iloc[0][col]
            if pd.notna(val):
                print(f"Fringe Field: {col.replace(' (Rs)',''):<26} | 1191       | {val:<12}")
                total_allowance += float(val)

    print("-" * 70)
    print(f"{'TOTAL ALLOWANCE (approx.)':<40} | {'':<10} | {total_allowance:<12}")
    print("\nNote: Educational Assistance depends on number of children, Night Shift depends on shifts done.")


if __name__ == '__main__':
    if len(sys.argv) > 1:
        emp_id = sys.argv[1]
        calculate_allowance(emp_id)
    else:
        print("Please provide an employee number.")
