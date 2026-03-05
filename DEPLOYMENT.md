# CRMPusher — VDS Deployment Guide

Tested on **Ubuntu 22.04 LTS**. Run all commands as `root` or prefix with `sudo`.

> All Nginx configs use `server_name _;` — they match any IP automatically. You never need to put your server IP anywhere in the config files.

---

## 1. Initial Server Setup

```bash
apt update && apt upgrade -y
apt install -y curl git ufw
```

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 8080
ufw enable
```

---

## 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

---

## 3. Install MySQL 8

```bash
apt install -y mysql-server
mysql_secure_installation
```

During the prompts:
- Set root password → `Asdewq!23454321`
- Remove anonymous users → **Y**
- Disallow root login remotely → **Y**
- Remove test database → **Y**
- Reload privilege tables → **Y**

### Create the app database and user

```bash
mysql -u root -pAsdewq!23454321
```

```sql
CREATE DATABASE crmpusher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crmpusher'@'%' IDENTIFIED BY 'Asdewq!23454321';
GRANT ALL PRIVILEGES ON crmpusher.* TO 'crmpusher'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### Allow MySQL to accept remote connections

By default MySQL only listens on localhost. Open the config and change the bind address:

```bash
sed -i 's/bind-address\s*=.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql
```

Open the MySQL port in the firewall:

```bash
ufw allow 3306
```

> Zapier will now be able to connect using your server IP, port 3306, user `crmpusher`, password `Asdewq!23454321`.

---

## 4. Install PHP & phpMyAdmin

```bash
apt install -y php php-fpm php-mbstring php-zip php-gd php-json php-curl php-mysql
apt install -y phpmyadmin
```

When prompted:
- Web server to configure: press **Space** to deselect all, then **Enter** (we use Nginx manually)
- Configure with dbconfig-common: **Yes**
- Set a phpMyAdmin application password

```bash
phpenmod mbstring
```

---

## 5. Install Nginx & PM2

```bash
apt install -y nginx
systemctl enable nginx
```

```bash
npm install -g pm2
pm2 startup systemd
# Copy and run the exact command it prints out
```

---

## 6. Clone the Repo

```bash
cd /var/www
git clone https://github.com/ThatsGreatguysaccount/crmpusher.git crmpusher
cd crmpusher
```

---

## 7. Configure the Backend

Generate a JWT secret and write the entire `.env` in one block:

```bash
cd /var/www/crmpusher/backend
JWT=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
PUBLIC_IP=$(curl -s -4 ifconfig.me)
cat > .env << EOF
PORT=3001

PUBLIC_HOST=$PUBLIC_IP

DB_HOST=localhost
DB_PORT=3306
DB_USER=crmpusher
DB_PASSWORD=Asdewq!23454321
DB_NAME=crmpusher

JWT_SECRET=$JWT
JWT_EXPIRES_IN=7d

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

POLL_INTERVAL_SECONDS=30
EOF
```

> **Only edit `ADMIN_PASSWORD`** — replace `CHANGE_THIS_PASSWORD` with your panel login password:
> ```bash
> sed -i 's/CHANGE_THIS_PASSWORD/YourPanelPassword/' /var/www/crmpusher/backend/.env
> ```

### Install dependencies & initialise the database

```bash
npm install
node setup.js
```

---

## 8. Build the Frontend

```bash
cd /var/www/crmpusher/frontend
npm install
npm run build
```

---

## 9. Start the Backend

```bash
cd /var/www/crmpusher/backend
pm2 start server.js --name crmpusher-backend
pm2 save
```

---

## 10. Configure Nginx

### Main site + API proxy

```bash
cat > /etc/nginx/sites-available/crmpusher << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/crmpusher/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### phpMyAdmin on port 8080

```bash
cat > /etc/nginx/sites-available/phpmyadmin << 'EOF'
server {
    listen 8080;
    server_name _;

    root /usr/share/phpmyadmin;
    index index.php;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }
}
EOF
```

### Enable & reload

```bash
ln -s /etc/nginx/sites-available/crmpusher /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/phpmyadmin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 11. Done — Get Your Access URLs

Run this to print your server's public IP and ready-to-open URLs:

```bash
IP=$(curl -s ifconfig.me)
echo ""
echo "✅ CRMPusher is live!"
echo ""
echo "  Admin Panel  →  http://$IP"
echo "  phpMyAdmin   →  http://$IP:8080"
echo ""
echo "  Panel login  →  admin / (password you set in .env)"
  echo "  MySQL login  →  crmpusher / Asdewq!23454321"
```

---

## 12. Updating After a Git Push

```bash
cd /var/www/crmpusher && git pull origin main
cd backend && npm install && pm2 restart crmpusher-backend
cd ../frontend && npm install && npm run build
```

---

## 13. Adding a Domain + SSL Later

Point your domain's DNS `A` record to the server IP, then:

```bash
apt install -y certbot python3-certbot-nginx

# Update server_name in both configs
sed -i 's/server_name _;/server_name yourdomain.com www.yourdomain.com;/' /etc/nginx/sites-available/crmpusher
sed -i 's/server_name _;/server_name pma.yourdomain.com;/' /etc/nginx/sites-available/phpmyadmin
sed -i 's/listen 8080;/listen 80;/' /etc/nginx/sites-available/phpmyadmin

nginx -t && systemctl reload nginx

certbot --nginx -d yourdomain.com -d www.yourdomain.com -d pma.yourdomain.com
```

---

## Troubleshooting

```bash
pm2 logs crmpusher-backend          # backend logs
tail -f /var/log/nginx/error.log    # nginx errors
systemctl status mysql              # database
systemctl status php8.1-fpm        # php (needed for phpMyAdmin)
```
