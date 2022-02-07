import { existsSync, writeFileSync } from "fs";
import path from "path";
import jose from "jose";
import crypto from "crypto";
import chalk from "chalk";

const accessTokenPublicDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "AccessTokenPublic.pem"
);
const accessTokenPrivateDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "AccessTokenPrivate.key"
);

const refreshTokenPublicDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "RefreshTokenPublic.pem"
);
const refreshTokenPrivateDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "RefreshTokenPrivate.key"
);


const idTokenPublicDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "IDTokenPublic.pem"
);
const idTokenPrivateDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "IDTokenPrivate.key"
);

const codeTokenPublicDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "CodeTokenPublic.pem"
);
const codeTokenPrivateDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "CodeTokenPrivate.key"
);

const emailTokenPublicDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "EmailTokenPublic.pem"
);
const emailTokenPrivateDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "EmailTokenPrivate.key"
);

const mfaTokenPublicDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "MfaTokenPublic.pem"
);
const mfaTokenPrivateDir = path.join(
  __dirname,
  "..",
  "config",
  "keys",
  "MfaTokenPrivate.key"
);

export const checkSetup = async () => {
  return new Promise(async (resolve, reject) => {
    const accessTokenPublic = await existsSync(accessTokenPublicDir);
    const accessTokenPrivate = await existsSync(accessTokenPrivateDir);

    const refreshTokenPublic = await existsSync(refreshTokenPublicDir);
    const refreshTokenPrivate = await existsSync(refreshTokenPrivateDir);

    const idTokenPublic = await existsSync(idTokenPublicDir);
    const idTokenPrivate = await existsSync(idTokenPrivateDir);

    const codeTokenPublic = await existsSync(codeTokenPublicDir);
    const codeTokenPrivate = await existsSync(codeTokenPrivateDir);

    const emailTokenPublic = await existsSync(emailTokenPublicDir);
    const emailTokenPrivate = await existsSync(emailTokenPrivateDir);

    const mfaTokenPublic = await existsSync(mfaTokenPublicDir);
    const mfaTokenPrivate = await existsSync(mfaTokenPrivateDir);

    if (
      !accessTokenPublic ||
      !accessTokenPrivate ||
      !refreshTokenPublic ||
      !refreshTokenPrivate ||
      !idTokenPublic ||
      !idTokenPrivate ||
      !codeTokenPublic ||
      !codeTokenPrivate ||
      !emailTokenPublic ||
      !emailTokenPrivate ||
      !mfaTokenPublic ||
      !mfaTokenPrivate
    ) {
      reject(
        new Error("Setup required, please run server with '--setup' param.")
      );
    } else {
      resolve(true);
    }
  });
};

export const initSetup = async () => {
  console.log(
    chalk.greenBright("Generating Access Token public and private keys")
  );
  const accessTokenKid = await crypto.randomBytes(2).toString("hex");
  const accessTokenKey = await jose.JWK.generateSync("RSA", 2048, {
    alg: "RS256", // encryption algorithm
    kid: accessTokenKid, // key unique id
    use: "sig", // use parameter (for signing, verification)
  });
  const accessTokenPublic = accessTokenKey.toPEM(false);
  const accessTokenPrivate = accessTokenKey.toPEM(true);
  console.log(
    chalk.greenBright(
      "Successfully generated Access Token public and private keys"
    )
  );

  console.log(chalk.greenBright("Saving keys in directory"));

  await writeFileSync(accessTokenPublicDir, accessTokenPublic);
  await writeFileSync(accessTokenPrivateDir, accessTokenPrivate);

  console.log(chalk.greenBright("Saved Access Token"));

  console.log(
    chalk.greenBright("Generating Refresh Token public and private keys")
  );
  const refreshTokenKid = await crypto.randomBytes(2).toString("hex");
  const refreshTokenKey = await jose.JWK.generateSync("RSA", 2048, {
    alg: "RS256", // encryption algorithm
    kid: refreshTokenKid, // key unique id
    use: "sig", // use parameter (for signing, verification)
  });
  const refreshTokenPublic = refreshTokenKey.toPEM(false);
  const refreshTokenPrivate = refreshTokenKey.toPEM(true);

  console.log(chalk.greenBright("Successfully generated Refresh Token public and private keys"));
  console.log(chalk.greenBright("Saving keys in directory"));

  await writeFileSync(refreshTokenPublicDir, refreshTokenPublic);
  await writeFileSync(refreshTokenPrivateDir, refreshTokenPrivate);

  console.log(chalk.greenBright("Saved Refresh Token"));

  console.log(chalk.greenBright("Generating ID Token public and private keys"));
  const idTokenKid = await crypto.randomBytes(2).toString("hex");
  const idTokenKey = await jose.JWK.generateSync("RSA", 2048, {
    alg: "RS256", // encryption algorithm
    kid: idTokenKid, // key unique id
    use: "sig", // use parameter (for signing, verification)
  });
  const idTokenPublic = idTokenKey.toPEM(false);
  const idTokenPrivate = idTokenKey.toPEM(true);
  console.log(
    chalk.greenBright("Successfully generated ID Token public and private keys")
  );

  console.log(chalk.greenBright("Saving keys in directory"));

  await writeFileSync(idTokenPublicDir, idTokenPublic);
  await writeFileSync(idTokenPrivateDir, idTokenPrivate);

  console.log(chalk.greenBright("Saved ID Token"));

  console.log(
    chalk.greenBright("Generating Code Token public and private keys")
  );
  const codeTokenKid = await crypto.randomBytes(2).toString("hex");
  const codeTokenKey = await jose.JWK.generateSync("RSA", 2048, {
    alg: "RS256", // encryption algorithm
    kid: codeTokenKid, // key unique id
    use: "sig", // use parameter (for signing, verification)
  });
  const codeTokenPublic = codeTokenKey.toPEM(false);
  const codeTokenPrivate = codeTokenKey.toPEM(true);
  console.log(
    chalk.greenBright(
      "Successfully generated Code Token public and private keys"
    )
  );

  console.log(chalk.greenBright("Saving keys in directory"));

  await writeFileSync(codeTokenPublicDir, codeTokenPublic);
  await writeFileSync(codeTokenPrivateDir, codeTokenPrivate);

  console.log(chalk.greenBright("Saved Code Token"));

  console.log(
    chalk.greenBright("Generating Email Token public and private keys")
  );
  const emailTokenKid = await crypto.randomBytes(2).toString("hex");
  const emailTokenKey = await jose.JWK.generateSync("RSA", 2048, {
    alg: "RS256", // encryption algorithm
    kid: emailTokenKid, // key unique id
    use: "sig", // use parameter (for signing, verification)
  });
  const emailTokenPublic = emailTokenKey.toPEM(false);
  const emailTokenPrivate = emailTokenKey.toPEM(true);
  console.log(
    chalk.greenBright(
      "Successfully generated Code Token public and private keys"
    )
  );

  console.log(chalk.greenBright("Saving keys in directory"));

  await writeFileSync(emailTokenPublicDir, emailTokenPublic);
  await writeFileSync(emailTokenPrivateDir, emailTokenPrivate);

  console.log(chalk.greenBright("Saved Email Token"));


  console.log(
    chalk.greenBright("Generating MFA Token public and private keys")
  );
  const mfaTokenKid = await crypto.randomBytes(2).toString("hex");
  const mfaTokenKey = await jose.JWK.generateSync("RSA", 2048, {
    alg: "RS256", // encryption algorithm
    kid: mfaTokenKid, // key unique id
    use: "sig", // use parameter (for signing, verification)
  });
  const mfaTokenPublic = mfaTokenKey.toPEM(false);
  const mfaTokenPrivate = mfaTokenKey.toPEM(true);
  console.log(
    chalk.greenBright(
      "Successfully generated Code Token public and private keys"
    )
  );

  console.log(chalk.greenBright("Saving keys in directory"));

  await writeFileSync(mfaTokenPublicDir, mfaTokenPublic);
  await writeFileSync(mfaTokenPrivateDir, mfaTokenPrivate);

  console.log(chalk.greenBright("Saved MFA Token"));
};
