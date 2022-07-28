import React from "react";

import styles from "./styles.module.css";

interface Props {
  screen: "recipients" | "template-editor";
  onChange: (screen: "recipients" | "template-editor") => void;
}

function Sidenav(props: Props) {
  return (
    <div className={styles.root}>
      <ul>
        <li
          onClick={() => {
            props.onChange("template-editor");
          }}
        >
          <div className={styles.listItem}>Template Editor</div>
        </li>
        <li
          onClick={() => {
            props.onChange("recipients");
          }}
        >
          <div className={styles.listItem}>Recipients</div>
        </li>
      </ul>
    </div>
  );
}

export default Sidenav;
