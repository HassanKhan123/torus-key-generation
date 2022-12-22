import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import ThresholdKey from "@tkey/default";
import WebStorageModule from "@tkey/web-storage";
import SecurityQuestionsModule from "@tkey/security-questions";
import swal from "sweetalert";
import crypto from "crypto-js";

// Configuration of Service Provider
const customAuthArgs = {
  baseUrl: `${window.location.origin}/serviceworker`,
  network: "cyan",
};
// Configuration of Modules
const webStorageModule = new WebStorageModule(); // For 2/2
const securityQuestionsModule = new SecurityQuestionsModule(true); // For 2/3

// Instantiation of tKey
const tKey = new ThresholdKey({
  modules: {
    //   webStorage: webStorageModule,
    securityQuestions: securityQuestionsModule,
  },
  customAuthArgs: customAuthArgs as any,
});

function App() {
  const [user, setUser] = useState<any>(null);
  const [torusKey, setTorusKey] = useState("");
  const [encKey, setEncKey] = useState("");
  const [securityAnswers, setSecurityAnswers] = useState(
    "pakistanbabarazam2017"
  );

  // Init Service Provider inside the useEffect Method
  useEffect(() => {
    const init = async () => {
      setSecurityAnswers(generateHash(securityAnswers));
      // Initialization of Service Provider
      await (tKey.serviceProvider as any).init();
      try {
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  const generateHash = (str: string) => {
    let hash = 0,
      i,
      chr;
    if (str.length === 0) return hash.toString();
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
  };

  const triggerLogin = async () => {
    try {
      // Triggering Login using Service Provider ==> opens the popup
      const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
        typeOfLogin: "google",
        verifier: "w3a-tkey-google",
        clientId:
          "774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com",
      });

      console.log("loginResponse", loginResponse);
      setUser(loginResponse);
      //   console.log("Public Key : " + loginResponse.publicAddress);
      //   console.log("Email : " + loginResponse.userInfo.email);
    } catch (error) {
      console.log(error);
    }
  };

  const checkSecurity = () => {
    let isExist = false;
    try {
      const qu = securityQuestionsModule.getSecurityQuestions();
      console.log("qu", qu);

      if (qu) {
        isExist = true;
      } else {
        isExist = false;
      }
      return isExist;
    } catch (error) {
      isExist = false;
      return isExist;
    }
  };

  const initializeNewKey = useCallback(async () => {
    try {
      await triggerLogin(); // Calls the triggerLogin() function above

      await tKey.initialize();
      const isExist = checkSecurity();

      console.log("isExist", isExist);

      if (isExist) {
        await securityQuestionsModule.inputShareFromSecurityQuestions(
          "babarAzam"
        );
      } else {
        await securityQuestionsModule.generateNewShareWithSecurityQuestions(
          "babarAzam",
          "Who is yout favorite player"
        );

        await securityQuestionsModule.saveAnswerOnTkeyStore("babarAzam");
      }

      const {
        requiredShares,
        pubKey,
        shareDescriptions,
        threshold,
        totalShares,
      } = tKey.getKeyDetails();
      console.log(
        "requiredShares",
        requiredShares,
        pubKey,
        shareDescriptions,
        threshold,
        totalShares
      );

      const reconstructedKey = await tKey.reconstructKey(true);
      uiConsole(
        "Reconstructed tKey: " + reconstructedKey.privKey.toString("hex")
      );
      setTorusKey(reconstructedKey.privKey.toString("hex"));
    } catch (error) {
      console.error(error, "caught");
    }
  }, [user]);

  const logout = (): void => {
    console.log("Log out");
    setUser(null);
  };

  const getUserInfo = (): void => {
    uiConsole(user);
  };

  const encrypt = (message: string, secret: string) => {
    console.log("torus", torusKey);
    const ciphertext = crypto.AES.encrypt(
      JSON.stringify(message),
      secret
    ).toString();

    uiConsole(ciphertext);

    setEncKey(ciphertext);

    return ciphertext;
  };

  const encryptWithCustomKey = (message: string) => {
    let secretKey;
    const key = localStorage.getItem("key");
    if (key) {
      console.log("key", key);

      secretKey = key;
    } else {
      secretKey = generateRandomNumber();
    }
    console.log("torus", torusKey);
    const ciphertext = crypto.AES.encrypt(
      JSON.stringify(message),
      secretKey
    ).toString();

    uiConsole(ciphertext);

    setEncKey(ciphertext);

    return ciphertext;
  };

  const generateRandomNumber = () => {
    const buf = new Uint8Array(1);
    const n = window.crypto.getRandomValues(buf);

    const randomNum = Math.floor(Math.random() * Number(n) * 1000000000);
    console.log(randomNum.toString());

    localStorage.setItem("key", randomNum.toString());
    return randomNum.toString();
  };

  const decrypt = (cipherText: string, secret: string) => {
    const bytes = crypto.AES.decrypt(cipherText, secret);
    console.log("bytes", JSON.parse(bytes.toString()));
    const decryptedText = JSON.parse(bytes.toString(crypto.enc.Utf8));
    uiConsole(decryptedText);
    return decryptedText;
  };

  const decryptWithCustomKey = (cipherText: string) => {
    const secretKey = localStorage.getItem("key");
    if (secretKey) {
      const bytes = crypto.AES.decrypt(cipherText, secretKey);
      const decryptedText = JSON.parse(bytes.toString(crypto.enc.Utf8));
      uiConsole(decryptedText);
      return decryptedText;
    } else {
      uiConsole("Cannot decrypt");
    }
  };

  const uiConsole = (...args: any[]): void => {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  };

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>

        <div>
          <button
            onClick={() => encrypt(user?.privateKey, torusKey)}
            className="card"
          >
            Encrypt Private Key with Torus
          </button>
        </div>
        <div>
          <button onClick={() => decrypt(encKey, torusKey)} className="card">
            Decrypt Private Key with Torus
          </button>
        </div>

        <div>
          <button
            onClick={() => encrypt(user?.privateKey, securityAnswers)}
            className="card"
          >
            Encrypt Private Key with Security Answers
          </button>
        </div>
        <div>
          <button
            onClick={() => decrypt(encKey, securityAnswers)}
            className="card"
          >
            Decrypt Private Key with Torus
          </button>
        </div>

        <div>
          <button
            onClick={() => encryptWithCustomKey(user?.privateKey)}
            className="card"
          >
            Encrypt Private Key with Custom Generated Key
          </button>
        </div>

        <div>
          <button onClick={() => decryptWithCustomKey(encKey)} className="card">
            Decrypt Private Key with Custom Generated Key
          </button>
        </div>

        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={initializeNewKey} className="card">
      Login
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth (tKey)
        </a>
        & ReactJS Ethereum Example
      </h1>

      <div className="grid">{user ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/examples/tree/main/tKey/tkey-react-example"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
