import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { type LinkItem } from 'src/shared/front-components/types/link-item.type';

// Real links: a front component cannot open a window by itself.
export const LinkList = ({ title, links }: { title: string; links: LinkItem[] }) => {
  const styles = readPopUpStyles();

  if (links.length === 0) {
    return null;
  }

  return (
    <div style={styles.card}>
      <div style={styles.title}>{title}</div>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          {link.name}
        </a>
      ))}
    </div>
  );
};
