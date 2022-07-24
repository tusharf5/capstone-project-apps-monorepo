import React, { useState } from "react";

import styles from "./styles.module.css";

import Sidenav from "../sidenav";
import TemplateEditor from "../template-editor";
import Recipients from "../recipients";

function Dashboard() {
  const [screen, setScreen] = useState<"recipients" | "template-editor">(
    "template-editor"
  );

  return (
    <div className={styles.root}>
      <div className={styles.sidenav}>
        <Sidenav
          screen={screen}
          onChange={(screen) => {
            setScreen(screen);
          }}
        />
      </div>
      <div className={styles.main}>
        {screen === "template-editor" ? <TemplateEditor /> : <Recipients />}
      </div>
    </div>
  );
}

export default Dashboard;
