import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { envConfig } from './common/config';

export class App {
  static async main() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const PORT = envConfig.PORT || 7001;
    const isProduction = process.env.NODE_ENV === 'production';

    app.setGlobalPrefix('api');

    // ── Security headers (Helmet) ──────────────────────────────────────────
    // Every option below is set explicitly and deliberately, not left as an
    // implicit Helmet default — see the audit report / chat explanation for
    // the full reasoning behind each one. Two things make this app's Helmet
    // config different from a typical "serve HTML pages" NestJS app:
    //   1. This backend is a pure JSON API, consumed by a SEPARATE frontend
    //      app running on its own origin/domain — so headers that govern how
    //      a BROWSER renders/loads an HTML document (CSP, COEP) either do
    //      nothing useful here or actively risk breaking that cross-origin
    //      frontend if left at Helmet's "serve a webpage" defaults.
    //   2. The one real HTML surface this app DOES serve is Swagger UI, and
    //      only in development (`isProduction` gate below, same pattern the
    //      app already uses for Swagger itself).
    app.use(
      helmet({
        // OFF. Helmet's default CSP is tuned for an app that serves its own
        // HTML/JS/CSS to a browser. This app doesn't — the real frontend is
        // a separate origin entirely, so a CSP header on THIS app's JSON
        // responses has no effect on that frontend's security at all (CSP
        // only governs the document that actually carries the header).
        // The one place a strict CSP *would* apply is Swagger UI's HTML
        // page, and Swagger's bundled UI relies on inline <style>/<script>
        // that Helmet's strict default CSP blocks by default — enabling it
        // would break the API docs for no real security benefit, since
        // Swagger is dev-only and never used by an end user's browser.
        contentSecurityPolicy: false,

        // ON, production-only. Forces browsers to only ever talk to this
        // API over HTTPS, for one year, including subdomains. Gated behind
        // `isProduction` because forcing HTTPS in local dev (plain HTTP on
        // localhost) would make the API unreachable from a dev frontend.
        hsts: isProduction
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,

        // 'cross-origin' (NOT Helmet's 'same-origin' default). This API is
        // *meant* to be fetched from a different origin (the separate
        // frontend app). Leaving Helmet's default here would attach a
        // same-origin Cross-Origin-Resource-Policy header that instructs
        // browsers to block that legitimate cross-origin usage — this is
        // the single Helmet default most likely to break the frontend if
        // left untouched, so it's explicitly overridden.
        crossOriginResourcePolicy: { policy: 'cross-origin' },

        // OFF (Helmet default is ON). COEP is for pages that need to embed
        // cross-origin resources under strict isolation (e.g. for
        // SharedArrayBuffer). This app doesn't embed anything and isn't a
        // document the frontend embeds — enabling it adds no protection
        // here and only risks interfering with Swagger's asset loading.
        crossOriginEmbedderPolicy: false,

        // Left at Helmet's default ('same-origin'). Governs window/opener
        // isolation for popups — irrelevant to plain fetch/XHR calls (which
        // is all the real frontend ever does against this API), so the
        // default is harmless and there's no reason to loosen it.
        crossOriginOpenerPolicy: { policy: 'same-origin' },

        // ON, Helmet default ('DENY'). Nothing about this API or its
        // Swagger docs is meant to be embedded in an <iframe> anywhere —
        // blocking that outright is pure upside (clickjacking protection)
        // with zero legitimate use case lost.
        frameguard: { action: 'deny' },

        // ON, Helmet default. Stops browsers from MIME-sniffing a response
        // into a different content-type than the API declares. This only
        // affects how a browser *interprets* a response's bytes — it does
        // not restrict who can fetch the response, so it cannot break CORS
        // or the frontend's ability to read JSON responses.
        noSniff: true,

        // ON, Helmet default ('no-referrer'). API responses aren't pages a
        // user navigates away from, so there's no legitimate referrer info
        // to forward — safe to strip entirely.
        referrerPolicy: { policy: 'no-referrer' },

        // ON, Helmet default. Removes the `X-Powered-By: Express` header so
        // the framework/version isn't advertised to every caller — pure
        // fingerprinting reduction, no functional effect.
        hidePoweredBy: true,

        // ON, Helmet default (disallow DNS prefetching). Irrelevant to a
        // JSON API with no outbound links for a browser to prefetch, but
        // harmless to leave on.
        dnsPrefetchControl: { allow: false },

        // ON, Helmet default. Legacy IE8 protection against a JSON/file
        // response being executed as HTML when downloaded directly — no
        // downside for a pure API.
        ieNoOpen: true,

        // ON, Helmet default ('none'). Blocks legacy Flash/Acrobat
        // cross-domain policy files from being read from this origin —
        // this app doesn't serve any, so this just closes an unused door.
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },

        // ON, Helmet default. Requests a separate origin-keyed process for
        // this app in supporting browsers — an extra process-isolation
        // hardening with no interaction with CORS/fetch behavior.
        originAgentCluster: true,
      }),
    );

    // JSON va URL-encoded body limitini oshirish (rasm base64 uchun)
    app.use(require('express').json({ limit: '10mb' }));
    app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

    // CORS — production'da faqat ruxsat etilgan domenlar
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : [];

    app.enableCors({
      origin: isProduction
        ? (origin, callback) => {
            // Origin yo'q bo'lsa (server-to-server) ruxsat
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
              return callback(null, true);
            }
            return callback(new Error(`CORS: ${origin} ruxsat etilmagan`), false);
          }
        : true, // Development'da hamma domen
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Global Validation
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );

    // Swagger faqat development'da
    if (!isProduction) {
      const config = new DocumentBuilder()
        .setTitle('Edu-Automation API')
        .setDescription(
          "O'quv markazi avtomatizatsiyasi — foydalanuvchilar, guruhlar, davomat, testlar, Telegram bot va boshqalar",
        )
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: "JWT tokenni quyidagicha kiriting: Bearer <token>",
          },
          'access-token',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);

      // setGlobalPrefix('api') yuqorida chaqirilgan va u BU YERGA HAM qo'shiladi —
      // shuning uchun bu yerda faqat 'docs' yozamiz, aks holda yakuniy manzil
      // /api/api/docs bo'lib qolib, /api/docs 404 qaytarardi.
      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
          defaultModelsExpandDepth: 3,
          defaultModelExpandDepth: 3,
        },
        customSiteTitle: 'Edu-Automation API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
      });
    }

    await app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      if (!isProduction) {
        console.log(`📄 Swagger Docs: http://localhost:${PORT}/api/docs`);
      }
      // .env faqat server ishga tushganda o'qiladi (hot-reload bo'lmaydi) — shu sabab
      // AI_TEST_GENERATION_ENABLED/GEMINI_API_KEY ni tekshirish uchun eng ishonchli joy shu yer.
      console.log(
        `🤖 AI test generation: ${envConfig.AI.AI_TEST_GENERATION_ENABLED ? "ENABLED" : "DISABLED"}` +
          ` (GEMINI_API_KEY: ${envConfig.AI.GEMINI_API_KEY ? "set" : "MISSING"})`,
      );
    });
  }
}
