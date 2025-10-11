import csv
import uuid
import random
from faker import Faker
from datetime import datetime

fake = Faker("en_US")
Faker.seed(42)
random.seed(42)

# ========== 1. DEFINE SAMPLE SCHOOLS ==========
SCHOOLS = [
    {"name": "School of Computer Science and Engineering", "code": "CSE"},
    {"name": "School of Electrical Engineering", "code": "EE"},
    {"name": "School of Business Administration", "code": "BA"},
    {"name": "School of Biotechnology", "code": "BT"},
    {"name": "School of Civil Engineering", "code": "CE"},
    {"name": "School of Industrial Systems Engineering", "code": "ISE"},
    {"name": "School of Chemical Engineering", "code": "CHE"},
]

timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ========== 2. GENERATE SCHOOLS ==========
def generate_schools():
    return [
        {
            "id": str(uuid.uuid4()),
            "name": s["name"],
            "code": s["code"],
            "description": f"{s['name']} at International University - VNU HCMC",
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        for s in SCHOOLS
    ]

# ========== 3. GENERATE TEACHERS ==========
def generate_teachers(schools):
    data = []
    for school in schools:
        num_teachers = random.randint(20, 30)
        for _ in range(num_teachers):
            teacher_id = str(uuid.uuid4())
            login_id = str(uuid.uuid4())
            data.append({
                "id": teacher_id,
                "name": fake.name(),
                "email": fake.unique.email(),
                "school_id": school["id"],
                "login_id": login_id,
                "created_at": timestamp,
                "updated_at": timestamp,
            })
    return data

# ========== 4. GENERATE COURSES ==========
def generate_courses(schools):
    data = []
    for school in schools:
        num_courses = random.randint(150, 250)
        for i in range(num_courses):
            course_code = f"{school['code']}{100 + i}"
            course_name = f"Introduction to {fake.word().capitalize()}"
            data.append({
                "id": str(uuid.uuid4()),
                "code": course_code,
                "name": course_name,
                "description": f"A foundational course in {course_name.lower()} offered by {school['name']}.",
                "credits": random.choice([2, 3, 4]),
                "school_id": school["id"],
                "created_at": timestamp,
                "updated_at": timestamp,
            })
    return data

# ========== 5. GENERATE STUDENTS ==========
def generate_students(schools):
    data = []
    for school in schools:
        num_students = random.randint(1000, 1500)
        for i in range(num_students):
            student_code = f"{school['code']}{2025}{i:04d}"
            data.append({
                "id": str(uuid.uuid4()),
                "email": fake.unique.email(),
                "name": fake.name(),
                "student_id": student_code,
                "school_id": school["id"],
                "created_at": timestamp,
                "updated_at": timestamp,
            })
    return data

# ========== 6. WRITE CSV HELPER ==========
def write_csv(filename, data, fieldnames):
    with open(filename, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"✅ {filename} generated ({len(data)} rows)")

# ========== 7. MAIN ==========
if __name__ == "__main__":
    schools = generate_schools()
    teachers = generate_teachers(schools)
    courses = generate_courses(schools)
    students = generate_students(schools)

    write_csv("schools.csv", schools, schools[0].keys())
    write_csv("teachers.csv", teachers, teachers[0].keys())
    write_csv("courses.csv", courses, courses[0].keys())
    write_csv("students.csv", students, students[0].keys())

    print("\n🎓 University data generation complete!")
