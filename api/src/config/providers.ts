import { Config } from "@config";
import assert from "assert";
import { IProvider } from "./../providers/IProvider";

// providers
import DiscordProvider from "@providers/DiscordProvider";
import GoogleProvider from "@providers/GoogleProvider";
import TwitterProvider from "@providers/TwitterProvider";

export const initializeProviders = (): IProvider[] => {
  return Config.AUTH.providers.map((p) => {
    assert(p.id, `id is not specified for provider '${p.type}'.`);
    assert(p.name, `name is not specified for provider '${p.type}'.`);
    assert(p.config, `config parameters are not specified for provider '${p.type}'.`);
    assert(p.config.clientId, `config parameter 'clientId' is not specified for provider '${p.type}'.`);
    assert(p.config.clientSecret, `config parameter 'clientSecret' are not specified for provider '${p.type}'.`);
    assert(p.config.clientRedirectUri,`config parameter 'clientRedirectUri' are not specified for provider '${p.type}'.`);
    switch (p.type) {
      case "google":
        {
          return new GoogleProvider(
            p.id,
            p.name,
            p.config.clientId,
            p.config.clientSecret,
            p.config.clientRedirectUri
          );
        }
        break;
      case "discord": {
        return new DiscordProvider(
          p.id,
          p.name,
          p.config.clientId,
          p.config.clientSecret,
          p.config.clientRedirectUri
        );
      }
      case "twitter": {
        return new TwitterProvider(
          p.id,
          p.name,
          p.config.clientId,
          p.config.clientSecret,
          p.config.clientRedirectUri
        );
      }
      default:
        throw new Error(`unknown provider type '${p.type}'.`);
    }
  });
};
