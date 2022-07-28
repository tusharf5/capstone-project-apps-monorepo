import React from "react";
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
  const form = useForm({
    initialValues: {
      email: "",
      termsOfService: false,
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  return (
    <div className={styles.root}>
      <div>
        <h2>Template Editor</h2>
      </div>
      <div className={styles.parent}>
        <div className={styles.child}>
          <form onSubmit={form.onSubmit((values) => console.log(values))}>
            <TextInput
              required
              label="Template Name"
              placeholder="my-template"
              {...form.getInputProps("template-name")}
            />

            <Textarea
              required
              label="Template"
              placeholder="<html></html>"
              {...form.getInputProps("template")}
            />

            <Group position="right" mt="md">
              <Button type="submit">Submit Template</Button>
            </Group>
          </form>
        </div>
        <div className={styles.child}>
          <form onSubmit={form.onSubmit((values) => console.log(values))}>
            <TextInput
              required
              label="Template Name"
              placeholder="my-template"
              {...form.getInputProps("template-name")}
            />

            <Textarea
              required
              label="Template Variables"
              placeholder='{"name":"John"}'
              {...form.getInputProps("variables")}
            />

            <Group position="right" mt="md">
              <Button type="submit">Render</Button>
            </Group>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TemplateEditor;
