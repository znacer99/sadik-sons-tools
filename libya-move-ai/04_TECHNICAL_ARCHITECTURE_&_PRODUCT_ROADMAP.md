# المعمارية التقنية ومواصفات المنتج والذكاء الاصطناعي
## LIBYA MOVE AI — Technical Architecture, AI Engine & Database Specifications

---

### 1. المخطط المعماري للنظام (System Architecture Overview)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATIONS LAYER                                 │
│  [Move Rider App]     [Move Driver Pro]    [Move Business]   [Ops Super-UI] │
│   (Flutter iOS/And)   (Flutter iOS/And)    (React + Vite)    (Admin / Map)  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ HTTPS / WSS (WebSocket Secure)
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                       API GATEWAY & LOAD BALANCER                           │
│              (NGINX / Cloudflare SSL + DDoS Protection)                     │
└───────┬───────────────────────────────┬─────────────────────────────┬───────┘
        │                               │                             │
┌───────▼──────────────┐  ┌─────────────▼──────────────┐  ┌───────────▼───────┐
│ Dispatch & Match Svc │  │ Location & Telematics Svc  │  │ Billing & Payment │
│ (Go / High Throughput│  │ (MQTT / WebSockets Node.js)│  │ (Sadad/Tadawul/   │
│  H3 Hexagonal Index) │  │ Redis Geo 3-sec GPS updates│  │  MobiCash/Cash)   │
└───────┬──────────────┘  └─────────────┬──────────────┘  └───────────┬───────┘
        │                               │                             │
┌───────▼───────────────────────────────▼─────────────────────────────▼───────┐
│                         MOVE AI INTELLIGENCE CORE                           │
│  • Predictive Demand (ST-GCN)    • Smart Return Ride Path Matcher           │
│  • Move Choice Scoring Engine     • Route Anomaly & Safety SOS Detector      │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                           PERSISTENCE & CACHING                             │
│   • PostgreSQL 16 + PostGIS (Spatial Data, Rides, Drivers, Corporate B2B)   │
│   • Redis Cluster (Driver Live Geolocation, Locks, Session Cache)           │
│   • Object Storage (MinIO / S3 for Driver IDs, Licenses, Trip Receipts)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. محركات الذكاء الاصطناعي الأربعة (Core AI Algorithms)

#### 1. محرك التنبؤ بالطلب (Demand Forecasting Engine):
* **النموذج**: Spatio-Temporal Graph Convolutional Network (ST-GCN).
* **المدخلات**: تقسيم طرابلس الكبرى إلى خلايا سداسية (Uber H3 Index - Resolution 8)، مع دمج بيانات الوقت، اليوم، مواعيد رحلات مطار معيتيقة، الطقس، والبيانات التاريخية.
* **المخرجات**: خريطة حرارية (Heatmap) تنبه السائقين قبل 20 دقيقة للتحرك نحو مناطق الطلب المرتفع (مثل بن عاشور عند نهاية الدوام الإداري)، مما يخفض زمن الوصول (ETA) إلى أقل من **4.2 دقيقة**.

#### 2. خوارزمية رحلة العودة الذكية (Smart Return Ride Engine):
* **المشكلة**: تفادي عودة السائق خالي الوفاض بعد إيصال راكب من طرابلس إلى تاجوراء أو جنزور أو المطار.
* **الخوارزمية**: تقوم بعمل مسح مكاني مخروطي (Spatial Cone Search) للمشاوير الموجهة من تاجوراء باتجاه طرابلس المركز التي يبدأ وقت طلبها في حدود ±7 دقائق من وقت انتهاء رحلة الذهاب الحالية، وتعرض المشوار مسبقاً على السائق كـ "رحلة عودة مؤكدة".

#### 3. محرك مزاد واختيار السائق (Move Choice Engine):
* يتيح للراكب رؤية 3 سيارات قريبة واختيار السائق بناءً على مصفوفة متعددة المعايير:
  $$\text{Score} = w_1 \cdot \text{ETA} + w_2 \cdot \text{DriverRating} + w_3 \cdot \text{VehicleTier} + w_4 \cdot \text{Fare}$$
* يمنح الراكب حرية القرار (مثلاً اختيار سيارة أحدث أو سائق أعلى تقييماً حتى لو كان الفارق دينارين)، مما يرفع رضا العملاء إلى أكثر من **96%**.

#### 4. نظام المراقبة الأمنية وكشف الشذوذ (Safety & Route Anomaly Detection):
* يراقب مسار السيارة كل 3 ثوانٍ؛ فإذا رصد انحرافاً يزيد عن 500 متر عن المسار الموصى به من خريطة OSRM أو توقفاً مفاجئاً غير مبرر لأكثر من 3 دقائق في غير الإشارات الضوئية، يقوم النظام آلياً بـ:
  1. إرسال تنبيه فوري لهاتف الراكب للتأكد من سلامته ("هل أنت بخير؟").
  2. إرسال إشعار لحظي لغرفة عمليات Move Safety في طرابلس.
  3. تنشيط خيار التتبع الصوتي والتواصل المباشر مع غرفة الطوارئ.

---

### 3. مخطط قاعدة البيانات التفاعلي (PostgreSQL + PostGIS Schema)

```sql
-- 1. جدول المستخدمين (الركاب، السائقين، مدراء الشركات)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL, -- 091 / 092 / 094 (Libya)
    role VARCHAR(20) CHECK (role IN ('rider', 'driver', 'corporate_admin', 'super_admin')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول بيانات واعتمادات السائقين وسياراتهم
CREATE TABLE drivers (
    id UUID PRIMARY KEY REFERENCES users(id),
    license_number VARCHAR(50) NOT NULL,
    national_id VARCHAR(50) NOT NULL,
    vehicle_make VARCHAR(50) NOT NULL,   -- e.g. Hyundai, Kia, Toyota
    vehicle_model VARCHAR(50) NOT NULL,  -- e.g. Elantra, Cerato, Camry
    vehicle_year INT NOT NULL,           -- >= 2012
    plate_number VARCHAR(30) NOT NULL,   -- ليبيا - طرابلس
    vehicle_color VARCHAR(30),
    is_online BOOLEAN DEFAULT FALSE,
    current_location GEOMETRY(Point, 4326),
    acceptance_rate NUMERIC(5, 2) DEFAULT 100.00,
    tier VARCHAR(20) DEFAULT 'Silver'    -- Silver, Gold, Platinum
);

-- 3. جدول الشركات والمؤسسات (Move Business)
CREATE TABLE corporate_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(150) NOT NULL,  -- e.g. Al-Madar, NOC, Bank of Commerce
    tax_number VARCHAR(50),
    credit_limit NUMERIC(12, 2) DEFAULT 10000.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    contact_email VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول الرحلات والحجوزات
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    corporate_id UUID REFERENCES corporate_accounts(id) NULL,
    service_type VARCHAR(30) NOT NULL,   -- taxi, choice, share, airport, women, auto_ride
    pickup_address VARCHAR(255) NOT NULL,
    pickup_location GEOMETRY(Point, 4326) NOT NULL,
    dropoff_address VARCHAR(255) NOT NULL,
    dropoff_location GEOMETRY(Point, 4326) NOT NULL,
    fare_gross NUMERIC(8, 2) NOT NULL,   -- e.g. 21.50 LYD
    platform_fee NUMERIC(8, 2) NOT NULL, -- e.g. 3.87 LYD (18%)
    driver_net NUMERIC(8, 2) NOT NULL,   -- e.g. 17.63 LYD
    payment_method VARCHAR(30) NOT NULL, -- cash, sadad, mobicash, tadawul, corporate_invoice
    payment_status VARCHAR(20) DEFAULT 'pending',
    ride_status VARCHAR(30) DEFAULT 'requested', -- requested, accepted, arrived, in_progress, completed, cancelled
    is_return_ride BOOLEAN DEFAULT FALSE,
    security_pin VARCHAR(4) NOT NULL,    -- 4-digit PIN for safety
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- 5. جدول إنذارات الأمان والطوارئ (Move Safety SOS)
CREATE TABLE safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES rides(id),
    alert_type VARCHAR(50) NOT NULL,     -- 'sos_button', 'route_deviation', 'prolonged_stop'
    alert_location GEOMETRY(Point, 4326),
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'investigating', 'resolved'
    resolved_by UUID REFERENCES users(id) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4. واجهات التكامل مع بوابات الدفع الليبية (Libyan Fintech Integrations)

1. **خدمة سداد (Sadad API - Al-Madar Al-Jadeed)**:
   - إنشاء طلب دفع فوري (Instant Charge Request) عبر رقم هاتف المشترك المعتمد في المنصة.
   - التحقق الثنائي عبر رمز سري لمرة واحدة (OTP) يتم إدخاله في التطبيق.
   - إشعار لحظي (Webhook) بتأكيد تحويل المبلغ إلى الحساب البنكي التجاري للمنصة.
2. **خدمة موبي كاش (MobiCash API - مصرف الوحدة)**:
   - دعم مباشر لعملاء مصرف الوحدة في المنطقة الغربية والشرقية للتسديد المباشر بخصم لحظي من الحساب المصرفي.
3. **منظومة تداول (Tadawul / Masrefy)**:
   - تفعيل محافظ الدفع الذكية لعملاء مصرف التجارة والتنمية والمصارف الشريكة.
4. **نظام التسوية النقدية ومحفظة السائق (Cash Reconciliation Ledger)**:
   - عند دفع الراكب نقداً، يتم احتساب عمولة المنصة (18%) كخصم تلقائي من المحفظة الرقمية للسائق.
   - يتم تزويد السائق بسقف سالب (مثلاً حتى -100 د.ل) ثم يقوم بتغذية رصيده عبر سداد أو بطاقات شحن Move Pay في المحطات ومراكز الفحص.
