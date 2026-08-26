# نشر المشروع على VPS (خطوة بخطوة، من الصفر)

هذا الدليل يفترض إنك ما جهّزت VPS قبل. نستخدم **Hetzner Cloud** كمثال (رخيص، حوالي 4-5€/شهر) — نفس الخطوات تقريبًا تنطبق على DigitalOcean أو أي مزود آخر.

## 1) إنشاء الـVPS

1. سوّي حساب على [hetzner.com/cloud](https://www.hetzner.com/cloud) (أو DigitalOcean)
2. أنشئ سيرفر جديد:
   - **الصورة (Image):** Ubuntu 24.04
   - **الحجم:** أرخص خطة (CX22 أو ما يعادلها، 2 vCPU / 4GB كافية جدًا لهذا المشروع)
   - **مفتاح SSH:** أضف مفتاح SSH العام لجهازك (أو استخدم كلمة مرور مؤقتًا)
3. بعد الإنشاء بتاخذ IP عام (مثال: `123.45.67.89`)

## 2) الاتصال بالسيرفر

```bash
ssh root@123.45.67.89
```

## 3) تثبيت Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

## 4) رفع المشروع للسيرفر

من جهازك المحلي (مو داخل السيرفر):

```bash
# إذا رفعت المشروع على GitHub (موصى به):
ssh root@123.45.67.89 "git clone https://github.com/<username>/ai-support-agent-mcp.git"

# أو نسخ مباشر بدون GitHub:
scp -r ai-support-agent-mcp root@123.45.67.89:/root/
```

## 5) إعداد متغيرات البيئة على السيرفر

```bash
ssh root@123.45.67.89
cd ai-support-agent-mcp
cp .env.example .env
nano .env   # حط مفتاح ANTHROPIC_API_KEY الحقيقي
```

## 6) التشغيل

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

تحقق إنها شغالة:

```bash
docker ps
curl http://localhost:3000/health
```

## 7) فتح المنافذ (Firewall)

```bash
ufw allow 22
ufw allow 3000   # الوكيل + نموذج الويب
ufw allow 5678   # n8n
ufw enable
```

الحين تقدر تفتح:
- `http://123.45.67.89:3000` → نموذج الويب
- `http://123.45.67.89:5678` → n8n (استورد `n8n/support-agent-webhook.json` من داخله)

## 8) (اختياري) دومين + HTTPS عبر Nginx + Certbot

لو عندك دومين، أفضل ممارسة إنك تحط Nginx كـ reverse proxy قدام البورتات، وتفعّل SSL مجاني عبر Let's Encrypt:

```bash
apt install -y nginx certbot python3-certbot-nginx
# سوّي server block يوجّه دومينك لـ localhost:3000
certbot --nginx -d yourdomain.com
```

هذا اختياري لعرض البورتفوليو — رابط IP مباشر كافي للتقديم.

## 9) التحديث لاحقًا

```bash
cd ai-support-agent-mcp
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```
