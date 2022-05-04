import createLocaleMiddleware from "express-locale";
import expressip from "express-ip";
import poweredby from "poweredby";
import morgan from "morgan";
import session from "express-session";
import FileStore from "session-file-store";

import express from "express";
const fileStore = FileStore(session);

import { Configuration, Inject as DInjected } from "@tsed/di";
import { PlatformApplication } from "@tsed/common";

import { cwd } from "process";
import { Config } from "./config";
import cors from "cors";
import methodOverride from "method-override";
import path from "path";
import "@tsed/typeorm";
import { LoggerService } from "./services/LoggerService";
import { WellKnownRoute } from "./routes/wellknown";
import { V1IndexRoute } from "./routes/v1";
import { IndexRoute } from "./routes";

const apiDir = __dirname;

@Configuration({
  rootDir: cwd(),
  acceptMimes: ["application/json"],
  port: Config.API.port,
  mount: {
    "/": [IndexRoute, V1IndexRoute, WellKnownRoute],
    "/v1": path.join(apiDir, "routes", "v1", "**", "*.ts"),
  },
  debug: true,
  middlewares: [
    express.json(),
    express.urlencoded({ extended: true }),
    methodOverride(),
  ],
  typeorm: [
    {
      name: "default",
      type: "mysql",
      host: Config.Database.host,
      port: 3306,
      username: Config.Database.user,
      password: Config.Database.pass,
      database: Config.Database.database,
      logging: Config.isLocal,
      synchronize: Config.isLocal || Config.isDevelop,
      driver: require("mysql2"),
      entities: [`${apiDir}/entities/*{.ts,.js}`],
      migrations: [`${apiDir}/migrations/*{.ts,.js}`],
      subscribers: [`${apiDir}/subscriber/*{.ts,.js}`],
    },
  ],
})
export class APIServer {
  @DInjected()
  app: PlatformApplication;
  @Configuration() settings: Configuration;

  constructor() {}

  public $beforeRoutesInit(): void | Promise<any> {
    this.app.use(cors({ origin: Config.FRONTEND.url, credentials: true }));
    this.app.getApp().set("trust proxy", Config.isProd ? 1 : 0);
    this.app.getApp().set("etag", false); // turn off
    this.app.use(
      session({
        name: "rsid",
        secret: Config.API.cookieSecret,
        saveUninitialized: false,
        // store: new memoryStore({
        //   checkPeriod: 86400000, // prune expired entries every 24h
        // }),
        store: new fileStore({
          path: "./sessions",
        }),
        // proxy: true,
        cookie: {
          path: "/",
          domain: Config.API.cookieDomain,
          httpOnly: false,
          secure: Config.isProd,
          expires: new Date(Date.now() + 86400 * 1000),
          maxAge: 86400 * 1000,
          //sameSite: 'strict'
        },
      })
    );
    this.app.use(morgan("dev"));
    this.app.use(poweredby(`${Config.appPackageInfo.appNameShort} API`));
    this.app.use(
      createLocaleMiddleware({
        priority: ["accept-language", "default"],
        default: "en-EN",
      })
    );
    this.app.use(expressip().getIpInfoMiddleware);
    this.app.getApp().set("json spaces", 2);
  }
}
