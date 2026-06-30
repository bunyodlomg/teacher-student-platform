# Cambridge Learn — Claude konteksti

O'qituvchi · o'quvchi platformasi. UI o'zbek tilida.

## Stack
- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** + **Framer Motion** + **GSAP** (`@gsap/react`, ScrollTrigger)
- **Dizayn tili — Aurora Glass** (glassmorphism + gradient mesh + rolga adaptiv ranglar). Pastdagi "Dizayn tizimi" bo'limiga qarang.
- **Zustand** (`src/store/session.ts`, `src/store/data.ts`)
- **Custom server** — `server.ts` (Next + **Socket.IO**)
- **MongoDB** + **Mongoose 8** (modellar `src/server/models/`)
- **Auth** — JWT cookie (`bcryptjs`, `jsonwebtoken`, `src/server/auth.ts`)

## Komandalar
```bash
npm install
npm run db:seed   # bootstrap admin yaratadi (agar mavjud bo'lmasa)
npm run dev       # tsx server.ts (port 3000)
npm run build     # next build
npm start         # production
```

`.env`:
- `MONGODB_URI` — default `mongodb://127.0.0.1:27017/cambridge-learn`
- `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT`

Bootstrap admin: `admin@cambridge.uz` / `admin12345`.

### Lokal MongoDB ishga tushirish (Docker)
```bash
docker run -d --name cambridge-mongo -p 27017:27017 mongo:7
```
Yoki MongoDB Community Server o'rnatib service sifatida ishga tushirish.

## Marshrutlar
| Route | Maqsad |
|---|---|
| `/` | Landing / login redirect |
| `/login` | Email + parol |
| `/student`, `/student/assignments`, `/student/progress`, `/student/groups/[id]` | O'quvchi |
| `/teacher`, `/teacher/review`, `/teacher/classes`, `/teacher/groups/[id]` | O'qituvchi |
| `/admin`, `/admin/users`, `/admin/groups` | Admin |
| `/api/auth/{login,logout,me}` | Auth REST |
| `/api/state` | Joriy foydalanuvchi uchun butun holat (bootstrap) |
| `/api/posts`, `/api/posts/[id]/{react,comment}` | Lenta |
| `/api/assignments` | Topshiriq yaratish (+ companion post) |
| `/api/submissions`, `/api/submissions/[id]/grade` | Topshirish / baholash |
| `/api/notifications/read` | Bildirishnomani o'qilgan deb belgilash |
| `/api/admin/users`, `/api/admin/groups`, `/api/admin/groups/[id]` (PATCH) | Admin CRUD + a'zolik |

## Ma'lumot oqimi (MUHIM)
Ilova **100% real** — klient mock/seed yo'q. Barcha ma'lumot MongoDB'dan API orqali keladi:
- `useSession` (`src/store/session.ts`) — `refresh()`→`/api/auth/me`, `login`, `logout`. Faqat `theme` localStorage'da saqlanadi; shaxsiyat doim serverdan.
- `useData` (`src/store/data.ts`) — `bootstrap()`→`/api/state`; har bir action mos API'ni chaqiradi va store'ni yangilaydi; Socket.IO real-time (`feed:new-post`, `feed:post-updated`, `assignment:new`, `submission:updated`, `notification:new`). `upsertById` bilan dedupe.
- `AppShell` mount'da `session.refresh()` → so'ng `data.bootstrap()` chaqiradi; route guard `hydrated` kutadi.
- `src/lib/socket.ts` — yagona umumiy Socket.IO klient ulanishi.
- Yangi foydalanuvchi faqat admin orqali yaratiladi (demo/ro'yxatdan o'tish yo'q). Yangi user default parol `cambridge123` (admin boshqasini berishi mumkin).
- **Login — oddiy matn** (email shart emas). DB'da hamon `User.email` maydoni ishlatiladi, lekin u shunchaki noyob login identifikatori (masalan `olim`); `lowercase`+`trim` tufayli katta-kichik harfga sezgir emas. UI'da "Login" deb yoritiladi, `type="text"`.

## Asosiy fayllar
- `server.ts` — HTTP + Socket.IO; ishga tushganda `connectDB()` chaqiradi, cookie'dan JWT ni o'qib, user/group room'larga qo'shadi.
- `src/server/db.ts` — `connectDB()` singleton Mongoose ulanish; modellar avtomatik ro'yxatdan o'tkaziladi.
- `src/server/models/*` — Mongoose schemalar. `Post` ichida `attachments`, `reactions`, `comments` **embedded** subdocs. `Group.studentIds` — ObjectId arrayi (alohida `GroupMember` collection yo'q).
- `src/server/api.ts` — `withAuth`, `requireUser`, `requireRole`, JSON yordamchilari (xatolar o'zbekcha).
- `src/server/io.ts` — socket emit yordamchilari, `room.user(id)` / `room.group(id)`.
- `src/server/auth.ts` — JWT + cookie, `getSessionUser`.
- `src/server/notify.ts` — `Notification.create()` + socket push.
- `src/server/scope.ts` — `accessibleGroupIds`, `loadStateFor`.
- `src/server/serialize.ts` — Mongoose `lean()` hujjatlarini `src/lib/types.ts` interfeyslariga aylantiradi (`_id` → `id: string`).
- `src/components/ui/*` — dizayn tizimi.
- `src/components/app/AppShell.tsx` — sidebar + top bar.

## Ma'lumot modeli
`User` · `Group` · `Post` · `Assignment` · `Submission` · `Notification` · `Announcement`.

- `Post.type`: `lesson | announcement | assignment`.
- `Submission.status`: `not_started | draft | submitted | approved | rejected`.
- `Submission` da `{ assignmentId, studentId }` unique compound index.
- `Post.reactions` — `[{ userId, emoji }]` embedded; serializer ularni `{ emoji, userIds[] }` ga aylantiradi.

## Dizayn tizimi — Aurora Glass (MUHIM)
Vizual til: **glassmorphism + gradient mesh + rolga adaptiv ranglar**. Yangi UI yozganda shu tizimga rioya qil — qattiq (hardcoded) ranglar ishlatma, doim token va accent o'zgaruvchilaridan foydalan.

**Rang tokenlari** (`src/app/globals.css`) — hammasi CSS o'zgaruvchilari, Tailwind orqali `bg / surface / elevated / border / ink / muted / faint / accent / accent-2 / accent-3 / accent-soft / accent-ink / success / warning / danger`.

**Rolga adaptiv accent** — `[data-role="student|teacher|admin"]` selektori `--accent*` larni qayta bo'yaydi:
- `student` → indigo→violet→cyan · `teacher` → emerald→teal→sky · `admin` → amber→orange→pink.
- `AppShell` ildiz `div` iga `data-role={role}` qo'yadi → butun ilova rolga qarab o'zini qayta bo'yaydi, **komponentni o'zgartirmasdan**. Mesh, glow, gradient, text — barchasi shu `--accent*` larni o'qiydi.
- Login/landing rol tanlanmagan, shu sabab default (indigo) brendni ishlatadi.

**Utility klasslar** (globals.css `@layer utilities`):
- `.glass`, `.glass-strong`, `.glass-card` — frosted (blur) yuzalar. Sticky topbar/sidebar va modal/card uchun.
- `.border-gradient`, `.border-gradient-glass` — gradient hairline ramka (padding-box/border-box trick).
- `.glow-accent`, `.glow-ring`, `.text-gradient`, `.nums` (tabular sonlar), `.eyebrow`, `.rule`.
- Tailwind: `shadow-glow-accent`/`shadow-glow-lg`, `bg-accent-gradient`/`bg-accent-sheen`, animatsiyalar `animate-gradient-x | shine | float | spin-slow | shimmer | pulse-ring`.

**Motion primitivlari** (`src/components/motion/`, `index.ts` dan import qil):
- `Aurora` — surilib yuruvchi gradient-mesh bloblar (`full` to'liq ekran, `intensity` tig'izlik). Accent rang varlarini o'qiydi → rolga moslashadi.
- `GlassCard` — kursorni kuzatuvchi spotlight + gradient hairline + lift bo'lgan frosted karta. **Signature komponent.**
- `ShimmerButton` — gradient + shine + glow + magnit asosiy CTA (eng muhim bitta amal uchun).
- `Magnetic` — kursorga egiluvchi hover wrapper. `GradientText` — suriluvchi accent gradient sarlavha.
- `SpotlightCard`, `CountUp`, `Reveal/Stagger/StaggerItem` (framer), `GsapReveal` (`data-reveal` bolalarini scroll'da stagger bilan ochadi — GSAP ScrollTrigger).
- `Button` variantlari: `primary | glow | secondary | ghost | danger | subtle`. `Card` `glass` prop bilan frosted bo'ladi.

**Qoidalar:**
- Asosiy CTA → `ShimmerButton` yoki `Button variant="glow"`. Oddiy karta → `GlassCard` yoki `Card glass`.
- Rang kerak bo'lsa **accent varlardan** (`text-accent`, `bg-accent-soft`, `rgb(var(--accent)/.x)`) — hex yozma, rolga moslashuv buziladi.
- Animatsiya **ma'noli** bo'lsin (orientatsiya/holat), bezak uchun emas. `prefers-reduced-motion` globals.css'da hurmat qilinadi.
- Signature easing: `cubic-bezier(0.16, 1, 0.3, 1)`.

## Konvensiyalar
- Foydalanuvchiga ko'rinadigan barcha matn — **o'zbek tilida**.
- Alias `@/*` → `src/*`.
- API javoblari `NextResponse.json`, xatolar `{ error: "..." }`.
- DB ga murojaat qilishdan oldin **`await connectDB()`** chaqirish (yangi route/script yozsangiz).
- Yangi socket eventlar uchun `src/server/io.ts` dagi `room` helperlaridan foydalanish.
- ID'lar — Mongo `ObjectId`. Client'ga doim `serialize.ts` orqali stringga aylantirib uzating.

## Muhim texnik eslatmalar
- `server.ts` eng birinchi qatorda `import "./src/server/polyfill"` qiladi — bu `globalThis.AsyncLocalStorage` ni `next` import qilinishidan oldin o'rnatadi. **O'chirmang yoki tartibini o'zgartirmang**: tsx (ESM) bilan custom server'da Next'ning `async-local-storage` moduli polyfilldan oldin yuklanib, "Invariant: AsyncLocalStorage accessed in runtime where it is not available" xatosini beradi.
- Dev/start `tsx server.ts` orqali (Next built-in `next dev` emas, chunki Socket.IO kerak).

## Eslatma
`DESIGN.md` — dizayn tizimi va IA hujjati.
