const hasProperty = <K extends keyof T, T extends Record<string, unknown>>(
  object: T,
  key: K
): boolean => {
  return !!object && Object.prototype.hasOwnProperty.call(object, key);
};
const nonNullable = <T>(value: T): value is NonNullable<T> => value != null;
// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true });
figma.ui.resize(400, 480);

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg: { NodeID: string }) => {
  const node = figma.getNodeById(msg.NodeID);
  if (!node) {
    figma.ui.postMessage({ message: "Not Found Node" });
    return;
  }

  if (node.type === "COMPONENT" || node.type === "INSTANCE") {
    type ComponentPropertiesNode = {
      componentProperties: {
        definitions?: Record<string, ComponentProperties>;
      };
    };
    type ComponentProperties = {
      name: string;
      type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP";
      defaultValue: string;
    };

    const nodeWithCP = node as (ComponentNode | InstanceNode) &
      ComponentPropertiesNode;

    if (!hasProperty(nodeWithCP.componentProperties, "definitions")) {
      figma.ui.postMessage({
        message: "This Component/Instance hasn't componentProperties",
      });
      return;
    }

    const definitionKeys = Object.keys(
      // @ts-ignore
      nodeWithCP.componentProperties.definitions
    );

    const componentProperties = definitionKeys
      .map((key) => {
        // @ts-ignore
        return nodeWithCP.componentProperties.definitions[key];
      })
      .filter(nonNullable);

    const convertPropType = (prop: ComponentProperties["type"]) => {
      switch (prop) {
        case "BOOLEAN":
          return "boolean";
        case "TEXT":
          return "string";
        case "INSTANCE_SWAP":
          return "Union";
        default:
          return "unknown";
      }
    };

    const ReactComponentProps = componentProperties.map((props) => {
      if (props.type !== "INSTANCE_SWAP") {
        return `${props.name}: ${convertPropType(props.type)}`;
      }

      const instanceId = props.defaultValue;
      const instanceNode = figma.getNodeById(instanceId);
      console.log(instanceNode?.type);
      if (instanceNode?.type === "COMPONENT") {
        const otherInstanceNames = instanceNode.parent?.children.map(
          (child) => {
            return `'${child.name}'`;
          }
        );
        return `${props.name}: ${otherInstanceNames?.join(" | ")}`;
      }
    });

    const ReactComponent = `
type Props = {
  ${ReactComponentProps.join("\n  ")}
}
export const ${node.name}: React.FC<Props> = () => {
  return <></>
}
    `;

    figma.ui.postMessage({
      message: "success",
      name: node.name,
      componentProperties: componentProperties,
      variantProperties: node.variantProperties,
      reactComponent: ReactComponent,
    });
  } else {
    figma.ui.postMessage({ message: "Neither Component nor Instance" });
  }

  // figma.closePlugin();
};
