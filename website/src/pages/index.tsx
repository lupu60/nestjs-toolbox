import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          🧰 {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs">
            Get Started →
          </Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: '🗄️ TypeORM Utilities',
    description: 'Audit logging, pagination, soft delete, and upsert — batteries included for TypeORM.',
  },
  {
    title: '📝 Logging',
    description: 'Drop-in logger services for Bunyan and Winston, plus HTTP request logging middleware.',
  },
  {
    title: '🔧 API Utilities',
    description: 'Response envelopes, request context, access control, OpenAPI codegen, and more.',
  },
];

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md padding-vert--lg">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className="padding-vert--xl">
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
        <section className="padding-vert--lg">
          <div className="container text--center">
            <Heading as="h2">Install only what you need</Heading>
            <pre style={{ display: 'inline-block', textAlign: 'left', padding: '1rem 2rem' }}>
              <code>npm install @nest-toolbox/response-envelope</code>
            </pre>
          </div>
        </section>
      </main>
    </Layout>
  );
}
