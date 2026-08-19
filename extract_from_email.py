import imaplib
import email
from email.header import decode_header
import re
import sys
import os
import time
import socket
from supabase import create_client

# Set socket timeout to 12 seconds so oversized messages never hang the script
socket.setdefaulttimeout(12)

import argparse

# ==============================================================================
# 1. DATABASE & SERVER CONFIGURATION
# ==============================================================================
SUPABASE_URL = "https://bliazzxcvzypcqgdxmwj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaWF6enhjdnp5cGNxZ2R4bXdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk4OTE5OCwiZXhwIjoyMDk2NTY1MTk4fQ.k717-XUxvwoCqPJwGliPIeaOWHhiGZEa9SSJnC2N15I"

IMAP_SERVER = "mail.alghaithcompanies.group"
DEFAULT_EMAIL_USER = "hr@alghaithcompanies.group"
DEFAULT_EMAIL_PASS = os.getenv("HR_EMAIL_PASSWORD", "alghaithHR@211260")

IGNORE_KEYWORDS = [
    "delivery status", "undelivered", "out of office", 
    "autoresponder", "failure notice", "re: [notice]", "mailer-daemon", "spam", "mail delivery"
]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==============================================================================
# 2. COMPLETE GLOBAL 195+ NATIONS (EN / FR / AR / CLEAN DEMONYMS)
# ==============================================================================
ALL_WORLD_COUNTRIES = {
    # Central Asia & Eurasia
    "Kazakhstani": ["kazakhstan", "kazakhstani", "kazakh", "kazakhe", "كازاخستان", "كازاخستاني", "قازاقستان"],
    "Uzbek": ["uzbekistan", "uzbek", "ouzbekistan", "ouzbek", "أوزبكستان", "أوزبكي"],
    "Azerbaijani": ["azerbaijan", "azerbaijani", "azerbaïdjan", "أذربيجان", "أذربيجاني"],
    "Turkmen": ["turkmenistan", "turkmen", "turkménistan", "تركمانستان", "تركماني"],
    "Kyrgyz": ["kyrgyzstan", "kyrgyz", "kirghizistan", "قيرغيزستان", "قيرغيزي"],
    "Tajik": ["tajikistan", "tajik", "tadjikistan", "طاجيكستان", "طاجيكي"],
    "Georgian": ["georgia", "georgian", "géorgie", "جورجيا", "جورجي"],
    "Armenian": ["armenia", "armenian", "arménie", "أرمينيا", "أرميني"],
    "Mongolian": ["mongolia", "mongolian", "mongolie", "منغوليا", "منغولي"],

    # North Africa & MENA
    "Algerian": ["algeria", "algerian", "algerie", "algérie", "algerien", "algérien", "algerienne", "dz", "جزائر", "جزائري", "جزائرية"],
    "Tunisian": ["tunis", "tunisia", "tunisian", "tunisie", "tunisien", "tunisienne", "تونس", "تونسي", "تونسية"],
    "Libyan": ["libya", "libyan", "libye", "libyen", "ليبيا", "ليبي", "ليبية"],
    "Egyptian": ["egypt", "egyptian", "egypte", "égyptien", "مصر", "مصري", "مصرية"],
    "Moroccan": ["morocco", "moroccan", "maroc", "marocain", "marocaine", "المغرب", "مغربي", "مغربية"],
    "Mauritanian": ["mauritania", "mauritanian", "mauritanie", "موريتانيا", "موريتاني"],
    "Sudanese": ["sudan", "sudanese", "soudan", "السودان", "سوداني"],
    "South Sudanese": ["south sudan", "جنوب السودان"],
    "Syrian": ["syria", "syrian", "syrie", "سوريا", "سوري"],
    "Lebanese": ["lebanon", "lebanese", "liban", "لبنان", "لبناني"],
    "Jordanian": ["jordan", "jordanian", "jordanie", "الأردن", "أردني"],
    "Palestinian": ["palestine", "palestinian", "فلسطين", "فلسطيني"],
    "Iraqi": ["iraq", "iraqi", "irak", "العراق", "عراقي"],
    "Yemeni": ["yemen", "yemeni", "yémen", "اليمن", "يمني"],
    "Saudi": ["saudi", "saudi arabia", "saoudite", "السعودية", "سعودي"],
    "Emirati": ["uae", "emirati", "emirates", "émirats", "الإمارات", "إماراتي"],
    "Kuwaiti": ["kuwait", "kuwaiti", "koweit", "الكويت", "كويتي"],
    "Qatari": ["qatar", "qatari", "قطر", "قطري"],
    "Omani": ["oman", "omani", "عمان", "عماني"],
    "Bahraini": ["bahrain", "bahraini", "bahreïn", "البحرين", "بحريني"],

    # South & East Asia
    "Indian": ["india", "indian", "inde", "indien", "الهند", "هندي"],
    "Pakistani": ["pakistan", "pakistani", "باكستان", "باكستاني"],
    "Bangladeshi": ["bangladesh", "bangladeshi", "بنغلاديش", "بنغلاديشي"],
    "Filipino": ["philippines", "filipino", "philippin", "الفلبين", "فلبيني"],
    "Nepalese": ["nepal", "nepalese", "népal", "نيبال", "نيبالي"],
    "Sri Lankan": ["sri lanka", "sri lankan", "سريلانكا", "سريلانكي"],
    "Indonesian": ["indonesia", "indonesian", "indonésie", "إندونيسيا", "إندونيسي"],
    "Malaysian": ["malaysia", "malaysian", "malaisie", "ماليزيا", "ماليزي"],
    "Vietnamese": ["vietnam", "vietnamese", "فيتنام", "فيتنامي"],
    "Thai": ["thailand", "thai", "thaïlande", "تايلاند", "تايلاندي"],
    "Chinese": ["china", "chinese", "chine", "chinois", "الصين", "صيني"],
    "Japanese": ["japan", "japanese", "japon", "japonais", "اليابان", "ياباني"],
    "South Korean": ["korea", "korean", "corée", "كوريا", "كوري"],

    # Sub-Saharan Africa
    "Kenyan": ["kenya", "kenyan", "كينيا", "كيني"],
    "Ugandan": ["uganda", "ugandan", "ouganda", "أوغندا", "أوغندي"],
    "Nigerian": ["nigeria", "nigerian", "نيجيريا", "نيجيري"],
    "Ghanaian": ["ghana", "ghanaian", "غانا", "غاني"],
    "Cameroonian": ["cameroon", "cameroonian", "cameroun", "الكاميرون", "كاميروني"],
    "Senegalese": ["senegal", "senegalese", "sénégal", "السنغال", "سنغالي"],
    "Ivorian": ["ivory coast", "côte d'ivoire", "ivoirien", "ساحل العاج", "إيفواري"],
    "Ethiopian": ["ethiopia", "ethiopian", "éthiopie", "إثيوبيا", "إثيوبي"],
    "Tanzanian": ["tanzania", "tanzanian", "tanzanie", "تنزانيا", "تنزاني"],
    "South African": ["south africa", "sud-africain", "جنوب أفريقيا"],
    "Zimbabwean": ["zimbabwe", "zimbabwean", "زيمبابوي"],
    "Zambian": ["zambia", "zambian", "زامبيا"],
    "Rwandan": ["rwanda", "rw", "رواندا"],
    "Malian": ["mali", "مالي"],
    "Chadian": ["chad", "tchad", "تشاد"],
    "Nigerien": ["niger", "النيجر"],

    # Europe & Americas
    "Turkish": ["turkey", "turkish", "turquie", "تركيا", "تركي"],
    "Russian": ["russia", "russian", "russie", "روسيا", "روسي"],
    "Ukrainian": ["ukraine", "ukrainian", "أوكرانيا", "أوكراني"],
    "French": ["france", "french", "français", "française", "فرنسا", "فرنسي"],
    "British": ["uk", "united kingdom", "british", "anglais", "بريطانيا", "بريطاني"],
    "German": ["germany", "german", "allemagne", "allemand", "ألمانيا", "ألماني"],
    "Italian": ["italy", "italian", "italie", "إيطاليا", "إيطالي"],
    "Spanish": ["spain", "spanish", "espagne", "إسبانيا", "إسباني"],
    "Portuguese": ["portugal", "portuguese", "البرتغال", "برتغالي"],
    "Greek": ["greece", "greek", "grèce", "اليونان", "يوناني"],
    "Polish": ["poland", "polish", "pologne", "بولندا", "بولندي"],
    "Romanian": ["romania", "romanian", "roumanie", "رومانيا", "روماني"],
    "Dutch": ["netherlands", "dutch", "pays-bas", "هولندا", "هولندي"],
    "Belgian": ["belgium", "belgian", "belgique", "بلجيكا", "بلجيكي"],
    "Swiss": ["switzerland", "swiss", "suisse", "سويسرا", "سويسري"],
    "American": ["usa", "united states", "american", "أمريكا", "أمريكي"],
    "Canadian": ["canada", "canadian", "كندا", "كندي"],
    "Brazilian": ["brazil", "brazilian", "brésil", "البرازيل", "برازيلي"],
    "Argentine": ["argentina", "argentine", "الأرجنتين", "أرجنتيني"],
    "Mexican": ["mexico", "mexican", "mexique", "المكسيك", "مكسيكي"],
    "Colombian": ["colombia", "colombian", "كولومبيا", "كولومبي"],
    "Australian": ["australia", "australian", "أستراليا", "أسترالي"]
}

PHONE_PREFIX_MAP = {
    "77": "Kazakhstani", "76": "Kazakhstani", "998": "Uzbek", "994": "Azerbaijani",
    "993": "Turkmen", "996": "Kyrgyz", "992": "Tajik", "995": "Georgian", "374": "Armenian", "976": "Mongolian",
    "213": "Algerian", "216": "Tunisian", "20": "Egyptian", "218": "Libyan", "212": "Moroccan",
    "222": "Mauritanian", "249": "Sudanese", "211": "South Sudanese", "963": "Syrian", "961": "Lebanese",
    "962": "Jordanian", "970": "Palestinian", "972": "Palestinian", "964": "Iraqi", "967": "Yemeni",
    "966": "Saudi", "971": "Emirati", "965": "Kuwaiti", "974": "Qatari", "968": "Omani", "973": "Bahraini",
    "91": "Indian", "92": "Pakistani", "880": "Bangladeshi", "63": "Filipino", "977": "Nepalese",
    "94": "Sri Lankan", "62": "Indonesian", "60": "Malaysian", "84": "Vietnamese", "66": "Thai",
    "86": "Chinese", "81": "Japanese", "82": "South Korean", "254": "Kenyan", "256": "Ugandan",
    "234": "Nigerian", "233": "Ghanaian", "237": "Cameroonian", "221": "Senegalese", "225": "Ivorian",
    "251": "Ethiopian", "255": "Tanzanian", "27": "South African", "263": "Zimbabwean", "260": "Zambian",
    "250": "Rwandan", "223": "Malian", "235": "Chadian", "227": "Nigerien", "90": "Turkish",
    "7": "Russian", "380": "Ukrainian", "33": "French", "44": "British", "49": "German",
    "39": "Italian", "34": "Spanish", "351": "Portuguese", "30": "Greek", "48": "Polish",
    "40": "Romanian", "31": "Dutch", "32": "Belgian", "41": "Swiss", "1": "American",
    "55": "Brazilian", "54": "Argentine", "52": "Mexican", "57": "Colombian", "61": "Australian"
}

# ==============================================================================
# 3. HELPER FUNCTIONS
# ==============================================================================
def clean_filename(name):
    return re.sub(r'[^a-zA-Z0-9._-]', '_', name)

def decode_mime_text(raw_text):
    """Cleanly decode MIME words (e.g. =?UTF-8?B?...?=) into UTF-8 text."""
    if not raw_text:
        return ""
    try:
        parts = decode_header(raw_text)
        decoded = ""
        for content, encoding in parts:
            if isinstance(content, bytes):
                decoded += content.decode(encoding or "utf-8", errors="ignore")
            else:
                decoded += str(content)
        return decoded.strip()
    except Exception:
        return str(raw_text).strip()

KNOWN_ACCOUNTS = {
    "hr@alghaithcompanies.group": "alghaithHR@211260",
    "info@alghaithcompanies.group": "alghaithINFO@211260",
    "alighaith@alghaithcompanies.group": "ALGHAITH@211260"
}

def get_imap_connection(email_user, email_pass):
    """Establish and return an authenticated IMAP connection with timeout."""
    for attempt in range(5):
        try:
            mail = imaplib.IMAP4_SSL(IMAP_SERVER, 993)
            mail.login(email_user, email_pass)
            mail.select("INBOX")
            return mail
        except Exception:
            time.sleep(1)
    raise Exception(f"Could not connect to IMAP server for {email_user} after multiple attempts.")

def get_existing_candidate_emails():
    """Fetch existing candidate emails from Supabase to prevent duplicates."""
    try:
        res = supabase.table("candidates").select("email").execute()
        existing = set()
        for row in res.data or []:
            if row.get("email"):
                existing.add(row["email"].strip().lower())
        print(f"📊 Loaded {len(existing)} existing candidate emails from Supabase for deduplication.", flush=True)
        return existing
    except Exception as e:
        print(f"⚠️ Warning: Could not query existing emails ({e}). Proceeding...", flush=True)
        return set()

def extract_phone(text):
    match = re.search(r'\+?\d{1,4}[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', text)
    return match.group(0).strip() if match else "N/A"

def extract_nationality(search_text="", phone="", attachment_names=None):
    combined_text = (search_text or "")
    if attachment_names:
        combined_text += " " + " ".join(attachment_names)
    clean_text = combined_text.lower()

    for standard_name, keywords in ALL_WORLD_COUNTRIES.items():
        for kw in keywords:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, clean_text):
                return standard_name

    if phone and phone != "N/A":
        clean_p = re.sub(r'[^\d+]', '', phone).lstrip('+').lstrip('00')
        for length in (3, 2, 1):
            prefix = clean_p[:length]
            if prefix in PHONE_PREFIX_MAP:
                return PHONE_PREFIX_MAP[prefix]

    return "N/A"

def extract_experience(text):
    match = re.search(r'(\d{1,2})\s*(?:\+|\s*ans|\s*years|\s*year|\s*سنوات|\s*سنة|\s*experience|\s*exp)', text, re.IGNORECASE)
    if match:
        return f"{match.group(1)}+ years"
    return "N/A"

def extract_education(text):
    lower = text.lower()
    if any(k in lower for k in ["master", "magistère", "ماجستير"]):
        return "Master's Degree"
    if any(k in lower for k in ["engineer", "ingénieur", "ingénieur d'état", "مهندس"]):
        return "Engineering Degree"
    if any(k in lower for k in ["bachelor", "licence", "license", "bac+3", "بكالوريوس", "ليسانس"]):
        return "Bachelor's Degree"
    if any(k in lower for k in ["technician", "ts", "technicien", "تقني سامي", "تقني"]):
        return "Technical Degree"
    if any(k in lower for k in ["bac", "high school", "ثانوية", "بكالوريا"]):
        return "High School"
    return "N/A"

def extract_specialty_and_position(subject, body):
    subj_clean = subject.strip()
    if len(subj_clean) > 75 or not subj_clean or any(k in subj_clean.lower() for k in ["cv", "resume", "application", "candidature"]):
        for pos in ["Mechanical Engineer", "Electrical Engineer", "Civil Engineer", "HSE Officer", "Accountant", "Project Manager", "Technician", "Supervisor", "Driver", "Operator", "Welder", "Safety Officer"]:
            if pos.lower() in body.lower():
                return pos, pos
        return subj_clean[:75] or "General Applicant", "N/A"
    return subj_clean[:75], "N/A"

# ==============================================================================
# 4. MAIN INBOX PROCESSING PIPELINE WITH TIMEOUT RECOVERY
# ==============================================================================
def get_next_candidate_id():
    """Fetch highest current ID from Supabase to assign incremental primary key IDs."""
    try:
        res = supabase.table("candidates").select("id").order("id", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0 and res.data[0].get("id") is not None:
            max_id = int(res.data[0]["id"])
            print(f"🔢 Current highest candidate ID in Supabase: {max_id}. New IDs will start at {max_id + 1}.", flush=True)
            return max_id + 1
    except Exception as e:
        print(f"⚠️ Warning: Could not fetch max ID ({e}). Using timestamp fallback.", flush=True)
    return int(time.time())

def extract_forwarded_candidate_info(sender_raw, subject, body_text, attachment_filenames):
    """
    If an email is forwarded (by boss Ali Ghaith, HR, or external recruiter),
    smartly unpack the true candidate's name, email, and position from the body/attachment/subject.
    """
    clean_subj = re.sub(r'^(?:fwd?|re|tr|trans|إعادة توجيه)\s*:\s*', '', subject, flags=re.IGNORECASE).strip()
    
    # 1. Look for Forwarded Header in body:
    # e.g. "From: John Doe <john@gmail.com>" / "De : ..." / "من: صالح بوعبيد <saleh@...>"
    fwd_from_match = re.search(r'(?:From|De|من|Sender|Expéditeur)\s*:\s*(?:["\']?([^<\n\r@]+?)["\']?\s*)?<([\w\.-]+@[\w\.-]+)>', body_text, re.IGNORECASE)
    if fwd_from_match:
        fwd_name = fwd_from_match.group(1)
        fwd_email = fwd_from_match.group(2).strip().lower()
        if fwd_name and len(fwd_name.strip()) > 2 and "@" not in fwd_name:
            clean_name = fwd_name.strip().replace('"', '').replace("'", '')
            return clean_name, fwd_email, clean_subj
        elif fwd_email:
            name_from_email = fwd_email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            return name_from_email, fwd_email, clean_subj

    # Simple email pattern in forwarded section:
    fwd_simple_email = re.search(r'(?:From|De|من)\s*:\s*([\w\.-]+@[\w\.-]+)', body_text, re.IGNORECASE)
    if fwd_simple_email:
        fwd_email = fwd_simple_email.group(1).strip().lower()
        name_from_email = fwd_email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
        return name_from_email, fwd_email, clean_subj

    # 2. Extract Candidate Name from Subject (e.g. "صالح بوعبيد فني لحام" or "John Doe - Electrical")
    subj_name_match = re.search(r'^([\u0600-\u06FF\w\s]{3,30})(?:\s*[-–|:]\s*|\s+(?:فني|مهندس|لحام|مشرف|engineer|technician|supervisor|welder|foreman|operator|cv|resume))', clean_subj, re.IGNORECASE)
    if subj_name_match:
        candidate_name = subj_name_match.group(1).strip()
        if len(candidate_name) > 3 and not any(w in candidate_name.lower() for w in ['electrical', 'drilling', 'welder', 'candidate', 'supervisor', 'engineer', 'planning']):
            return candidate_name, None, clean_subj

    # 3. Extract Name from CV attachment filename (e.g. "CV_Saleh_Bouabid.pdf", "Mansouri_Abdelhafid_CV.pdf")
    for fn in attachment_filenames:
        fn_clean = os.path.splitext(fn)[0]
        fn_clean = re.sub(r'\b(?:cv|resume|certificat|diplome|passport|id|pdf|doc|docx|new|final|updated|202[0-9]|compressed)\b', '', fn_clean, flags=re.IGNORECASE)
        fn_clean = fn_clean.replace('_', ' ').replace('-', ' ').replace('.', ' ').strip()
        words = fn_clean.split()
        if 1 < len(words) <= 4 and all(len(w) > 1 for w in words):
            return fn_clean.title(), None, clean_subj

    return None, None, clean_subj

def process_inbox(email_user="hr@alghaithcompanies.group", email_pass="alghaithHR@211260", dry_run=False):
    existing_emails = get_existing_candidate_emails()
    next_candidate_id = get_next_candidate_id()

    print(f"\n🔌 Connecting to {IMAP_SERVER} for {email_user} (SSL 993)...", flush=True)
    mail = get_imap_connection(email_user, email_pass)

    status, messages = mail.search(None, "ALL")
    if status != "OK" or not messages[0]:
        print("No messages found in INBOX.", flush=True)
        return

    email_ids = messages[0].split()
    total = len(email_ids)
    print(f"📥 Found {total} total messages in {email_user} INBOX. Starting fast extraction...\n", flush=True)

    imported_count = 0
    duplicate_count = 0
    skipped_junk_count = 0

    for idx, e_id in enumerate(email_ids, start=1):
        msg_data = None
        for retry in range(2):
            try:
                res, msg_data = mail.fetch(e_id, "(RFC822)")
                break
            except Exception:
                try:
                    mail.close()
                except Exception:
                    pass
                try:
                    mail = get_imap_connection(email_user, email_pass)
                except Exception:
                    pass

        if not msg_data:
            continue

        try:
            for part_item in msg_data:
                if not isinstance(part_item, tuple):
                    continue

                msg = email.message_from_bytes(part_item[1])

                # 1. Parse Subject & Sender (Clean decoded MIME)
                subject = decode_mime_text(msg.get("Subject", "Job Application"))
                sender_raw = decode_mime_text(msg.get("From", ""))

                # Skip system notices, bounces, auto-replies
                if any(k in subject.lower() for k in IGNORE_KEYWORDS):
                    skipped_junk_count += 1
                    continue

                # 2. Parse Body & Attachments first
                body_text = ""
                cv_filepath = None
                id_document_filepath = None
                attachments_found = []
                attachment_filenames = []

                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disp = str(part.get('Content-Disposition'))

                    if content_type == 'text/plain' and 'attachment' not in content_disp:
                        try:
                            body_text += part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        except Exception:
                            pass

                    filename = part.get_filename()
                    if filename and ('attachment' in content_disp or 'inline' in content_disp):
                        clean_fn = clean_filename(decode_mime_text(filename))
                        ext = clean_fn.split('.')[-1].lower()

                        if ext in ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']:
                            file_data = part.get_payload(decode=True)
                            storage_path = f"email_imports/{e_id.decode()}_{clean_fn}"
                            attachments_found.append((clean_fn, storage_path, file_data))
                            attachment_filenames.append(clean_fn)

                has_job_keywords = any(w in subject.lower() or w in body_text.lower() for w in ['cv', 'resume', 'job', 'apply', 'candidat', 'position', 'foreman', 'engineer', 'technician', 'welder', 'supervisor', 'سيرة', 'توظيف', 'انضمام', 'طلب عمل', 'لحام', 'مشرف'])
                if not attachments_found and not has_job_keywords:
                    skipped_junk_count += 1
                    continue

                # 3. Detect Forwarded Emails vs Direct Candidate Applications
                is_forwarded = (
                    any(p in subject.lower() for p in ['fwd:', 'fw:', 'tr:', 'trans:']) or
                    'alghaith' in sender_raw.lower() or
                    'forwarded message' in body_text.lower() or
                    'من:' in body_text or
                    'de :' in body_text.lower()
                )

                fwd_name, fwd_email, clean_subj = extract_forwarded_candidate_info(sender_raw, subject, body_text, attachment_filenames)

                email_match = re.search(r'[\w\.-]+@[\w\.-]+', sender_raw)
                raw_sender_email = email_match.group(0).strip().lower() if email_match else f"applicant_{e_id.decode()}@alghaithcompanies.group"

                if is_forwarded and fwd_email:
                    candidate_email = fwd_email
                elif is_forwarded and not fwd_email:
                    # Generate a unique applicant email so the boss's email isn't deduplicated/skipped!
                    candidate_email = f"fwd_applicant_{e_id.decode()}@alghaithholding.com"
                else:
                    candidate_email = raw_sender_email

                # Deduplication Check
                if candidate_email in existing_emails:
                    duplicate_count += 1
                    continue

                if is_forwarded and fwd_name:
                    candidate_name = fwd_name
                else:
                    candidate_name = sender_raw.split("<")[0].replace('"', '').replace("'", '').strip()
                    if not candidate_name or "@" in candidate_name or "=?" in candidate_name or 'ali ghaith' in candidate_name.lower():
                        if attachment_filenames:
                            candidate_name = os.path.splitext(attachment_filenames[0])[0].replace('_', ' ').title()
                        else:
                            candidate_name = candidate_email.split("@")[0].replace(".", " ").title()

                # 4. Upload attachments to Supabase Storage
                for clean_fn, storage_path, file_data in attachments_found:
                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/candidates/{storage_path}"
                    ext = clean_fn.split('.')[-1].lower()
                    
                    mime_map = {
                        'pdf': 'application/pdf',
                        'doc': 'application/msword',
                        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'png': 'image/png'
                    }
                    content_type = mime_map.get(ext, 'application/octet-stream')

                    if not dry_run:
                        try:
                            supabase.storage.from_("candidates").upload(
                                storage_path,
                                file_data,
                                file_options={"upsert": "true", "content-type": content_type}
                            )
                        except Exception as upload_err:
                            print(f"  ⚠️ Storage upload warning for {clean_fn}: {upload_err}", flush=True)

                    lower_fn = clean_fn.lower()
                    if any(id_w in lower_fn for id_w in ['id', 'passport', 'cin', 'passeport', 'بطاقة', 'جواز', 'identite']):
                        id_document_filepath = public_url
                    else:
                        if not cv_filepath:
                            cv_filepath = public_url
                        else:
                            id_document_filepath = public_url

                # 5. Extract structured details
                phone = extract_phone(body_text)
                nationality = extract_nationality(subject + " " + body_text, phone=phone, attachment_names=attachment_filenames)
                applied_position, specialty = extract_specialty_and_position(clean_subj, body_text)
                experience = extract_experience(body_text)
                education = extract_education(body_text)

                # 6. Build candidate record with primary key ID
                record = {
                    "id": next_candidate_id,
                    "full_name": candidate_name,
                    "email": candidate_email,
                    "phone": phone,
                    "nationality": nationality,
                    "applied_position": applied_position,
                    "specialty": specialty,
                    "experience": experience,
                    "education": education,
                    "skills": "N/A",
                    "department_id": None,
                    "cv_filepath": cv_filepath,
                    "id_document_filepath": id_document_filepath,
                    "status": "NEW"
                }

                if dry_run:
                    print(f"[{idx}/{total}] [DRY-RUN] (ID: {next_candidate_id}) {candidate_name:<22} | {candidate_email:<28} | {nationality:<14} | {applied_position:<22} | CV: {bool(cv_filepath)}", flush=True)
                else:
                    supabase.table("candidates").insert(record).execute()
                    print(f"[{idx}/{total}] ✅ Inserted (ID: {next_candidate_id}): {candidate_name} ({candidate_email}) - {nationality} - {applied_position}", flush=True)

                next_candidate_id += 1
                existing_emails.add(candidate_email)
                imported_count += 1

        except Exception as msg_err:
            print(f"⚠️ Error on message #{e_id.decode() if isinstance(e_id, bytes) else e_id}: {msg_err}", flush=True)

    try:
        mail.close()
        mail.logout()
    except Exception:
        pass

    print("\n" + "="*70, flush=True)
    print(f"🎉 EXTRACTION SUMMARY {'(DRY RUN - PREVIEW ONLY)' if dry_run else '(LIVE RUN COMPLETE)'}", flush=True)
    print(f"  • Email Account: {email_user}", flush=True)
    print(f"  • Total Emails Scanned: {total}", flush=True)
    print(f"  • New Candidates Identified: {imported_count}", flush=True)
    print(f"  • Skipped Duplicates (Already in Supabase): {duplicate_count}", flush=True)
    print(f"  • Skipped Non-Applicant / System Junk: {skipped_junk_count}", flush=True)
    print("="*70 + "\n", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract candidates from cPanel webmail into Supabase.")
    parser.add_argument("--email", default=None, help="Specific email address to process")
    parser.add_argument("--password", default=None, help="Password for the email account")
    parser.add_argument("--all", action="store_true", help="Process all known company inboxes automatically")
    parser.add_argument("--dry-run", action="store_true", help="Preview mode without database writes")
    
    args = parser.parse_args()
    
    if args.all or not args.email:
        print("🚀 RUNNING AUTOMATED SYNC FOR ALL COMPANY INBOXES...\n", flush=True)
        for acc_email, acc_pass in KNOWN_ACCOUNTS.items():
            print(f"\n==================== PROCESSING: {acc_email} ====================", flush=True)
            try:
                process_inbox(email_user=acc_email, email_pass=acc_pass, dry_run=args.dry_run)
            except Exception as acc_err:
                print(f"⚠️ Error processing {acc_email}: {acc_err}. Skipping to next account...", flush=True)
        print("\n🎉 ALL INBOXES PROCESSED SUCCESSFULLY!", flush=True)
    else:
        target_email = args.email.strip()
        target_pass = args.password or KNOWN_ACCOUNTS.get(target_email, DEFAULT_EMAIL_PASS)

        if args.dry_run:
            print(f"🔍 RUNNING IN PREVIEW / DRY-RUN MODE FOR: {target_email}\n", flush=True)
        
        process_inbox(email_user=target_email, email_pass=target_pass, dry_run=args.dry_run)
