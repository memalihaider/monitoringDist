export type ChapterSection = {
  heading: string;
  paragraphs: string[];
};

export type Chapter = {
  slug: string;
  title: string;
  summary: string;
  sections: ChapterSection[];
};

export const chapters: Chapter[] = [
  {
    slug: "chapter-1-gathering-and-analyzing-information",
    title: "Chapter 1: Gathering and Analyzing Information",
    summary:
      "Introduces the distributed monitoring problem, objectives, project scope, methodology, and terminology.",
    sections: [
      {
        heading: "1.1 Introduction",
        paragraphs: [
          "Modern distributed systems use multiple interconnected services such as HDFS, Kafka, Zookeeper, databases, and containers.",
          "Because failures can be partial and hidden, system observability must include both high-level visibility and detailed diagnostics.",
        ],
      },
      {
        heading: "1.2 Problem Statement",
        paragraphs: [
          "Monitoring tools are often fragmented and service-specific, which delays root-cause analysis and increases downtime.",
          "White-box metrics and black-box service checks must be combined in one platform for practical operations.",
        ],
      },
      {
        heading: "1.3 Aim and Objectives",
        paragraphs: [
          "The project aims to deliver an end-to-end monitoring platform for reliability and performance visibility.",
          "Core objectives include custom exporters, Prometheus scraping, Grafana dashboards, and service validation workflows.",
        ],
      },
      {
        heading: "1.4 Scope",
        paragraphs: [
          "The implementation targets selected distributed services in a containerized single-host environment.",
          "Long-term storage, automated remediation, and multi-cluster orchestration are future extensions.",
        ],
      },
      {
        heading: "1.5 Methodology",
        paragraphs: [
          "An iterative development process is used with continuous testing and dashboard refinement.",
          "Docker Compose is used for reproducible deployment and operational consistency.",
        ],
      },
    ],
  },
  {
    slug: "chapter-2-software-requirement-specification",
    title: "Chapter 2: Software Requirement Specification",
    summary:
      "Defines stakeholders, literature context, and both functional and non-functional requirements for the platform.",
    sections: [
      {
        heading: "2.1 Literature Review",
        paragraphs: [
          "Prometheus and Grafana are widely adopted due to pull-based collection, exporter ecosystem, and flexible visualization.",
          "Research emphasizes combining infrastructure telemetry with external service behavior checks.",
        ],
      },
      {
        heading: "2.2 Stakeholders",
        paragraphs: [
          "Primary stakeholders include system administrators, DevOps engineers, developers, DBAs, and evaluators.",
          "End users benefit indirectly through improved service reliability and lower outage impact.",
        ],
      },
      {
        heading: "2.4 Functional Requirements",
        paragraphs: [
          "Key requirements include service health checks, latency measurement, dynamic discovery, metric exposure, and dashboards.",
          "The solution must support multi-service monitoring with configurable parameters and clear metric labeling.",
        ],
      },
      {
        heading: "2.5 Non-Functional Requirements",
        paragraphs: [
          "The system must remain scalable, maintainable, portable, and resource efficient under operational load.",
          "Security and availability requirements mandate stable operation and safe handling of credentials.",
        ],
      },
    ],
  },
  {
    slug: "chapter-3-analysis",
    title: "Chapter 3: Analysis",
    summary:
      "Describes actors, use cases, and interaction boundaries between users, Prometheus, exporters, and Grafana.",
    sections: [
      {
        heading: "3.1 Introduction",
        paragraphs: [
          "This chapter bridges requirements and implementation by describing expected behavior without low-level details.",
          "It ensures the design phase reflects practical workflows and role responsibilities.",
        ],
      },
      {
        heading: "3.2 Actors Identification",
        paragraphs: [
          "Main actors include System Administrator, DevOps Engineer, Monitoring System, and Grafana Platform.",
          "Each actor contributes to continuous observability and operational decision-making.",
        ],
      },
      {
        heading: "3.3 Core Use Cases",
        paragraphs: [
          "Use cases cover smoketest execution, metric collection, database monitoring, and dashboard-based analysis.",
          "The model clarifies system boundaries and autonomous behavior of exporters and Prometheus.",
        ],
      },
      {
        heading: "3.4 Detailed Use Cases",
        paragraphs: [
          "Detailed flows define preconditions, execution steps, and postconditions for key monitoring operations.",
          "This supports verifiable implementation and structured testing in later phases.",
        ],
      },
    ],
  },
  {
    slug: "chapter-4-design",
    title: "Chapter 4: Design",
    summary:
      "Covers architecture and modeling artifacts including software architecture, ERD, DFD, sequence, and class diagrams.",
    sections: [
      {
        heading: "4.1 Design Overview",
        paragraphs: [
          "The design phase transforms analytical requirements into concrete system structure and data flow boundaries.",
          "Prometheus exporters, scraping layer, and visualization layer are represented as integrated components.",
        ],
      },
      {
        heading: "4.2 Diagram Set",
        paragraphs: [
          "Planned diagrams include Software Architecture, ERD, Data Flow Diagram, Sequence Diagram, and Class Diagram.",
          "These artifacts provide implementation guidance for deployment, telemetry processing, and UI interaction.",
        ],
      },
    ],
  },
];

export function getChapterBySlug(slug: string) {
  return chapters.find((chapter) => chapter.slug === slug) ?? null;
}
