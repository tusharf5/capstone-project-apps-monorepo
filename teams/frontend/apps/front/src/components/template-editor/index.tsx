import React, { useState } from "react";
import { TextInput, Checkbox, Button, Group, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";

import styles from "./styles.module.css";

import axios from "axios";

async function submitTemplate(data: { template: string; name: string }) {
  try {
    const response = await axios.post(
      "http://k8s-capstone-cc5c185db7-207881783.us-west-2.elb.amazonaws.com/bff/templates",
      data
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

async function render(data: {
  variables: Record<string, unknown>;
  name: string;
}) {
  try {
    const response = await axios.post(
      "http://k8s-capstone-cc5c185db7-207881783.us-west-2.elb.amazonaws.com/bff/templates/render",
      data
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

function TemplateEditor() {
  const [rendered, setRendered] = useState("");
  const submitForm = useForm({
    initialValues: {
      template: "",
      template_name: "test",
    },
  });

  const renderForm = useForm({
    initialValues: {
      variables: "",
      template_name: "test",
    },
  });

  async function onTemplateSubmit(val: any) {
    const resp = await submitTemplate({
      template: val.template,
      name: val.template_name,
    });
    console.log(resp);
  }

  async function onTemplateRender(val: any) {
    try {
      const resp = await render({
        variables: JSON.parse(val.variables),
        name: val.template_name,
      });
      setRendered(resp.body);
      console.log(resp);
    } catch {}
  }

  return (
    <div className={styles.root}>
      <div>
        <h2>Template Editor</h2>
      </div>
      <div className={styles.parent}>
        <div className={styles.child}>
          <form
            onSubmit={submitForm.onSubmit((values) => onTemplateSubmit(values))}
          >
            <TextInput
              required
              label="Template Name"
              placeholder="my-template"
              {...submitForm.getInputProps("template_name")}
            />

            <Textarea
              required
              label="Template"
              placeholder="<html></html>"
              {...submitForm.getInputProps("template")}
            />

            <Group position="right" mt="md">
              <Button type="submit">Submit</Button>
            </Group>
          </form>
        </div>
        <div className={styles.child}>
          <form
            onSubmit={renderForm.onSubmit((values) => onTemplateRender(values))}
          >
            <TextInput
              required
              label="Template Name"
              placeholder="my-template"
              {...renderForm.getInputProps("template_name")}
            />

            <Textarea
              required
              label="Template Variables"
              placeholder='{"name":"John"}'
              {...renderForm.getInputProps("variables")}
            />

            <Group position="right" mt="md">
              <Button type="submit">Render</Button>
            </Group>
          </form>
        </div>
      </div>
      <div className={styles.rendered}>
        <div
          dangerouslySetInnerHTML={{
            __html: rendered,
          }}
        ></div>
      </div>
    </div>
  );
}

export default TemplateEditor;
