import { parse } from 'node-html-parser';
import fs from 'fs';
import path from 'path';

// todo: 通过一些配置文件来获取需要抓取的组件列表来更新json
const components = [
  'button',
  'container'
]
components.forEach(component => {
  const componentUrl = `https://element-plus.org/zh-CN/component/${component}.html`;  
  const link = `https://element-plus.org/en-US/component/${component}.html`
  fetch(componentUrl)
    .then(res => res.text())
    .then(data => {
      const root = parse(data);
      const tables = root.querySelectorAll('table');
      const result: any[] = [];

      tables.forEach(table => {
        // 优先找 table 的 previousElementSibling
        let name = '';
        let prev = table.previousElementSibling;
        while (prev) {
          if (/^H[2-4]$/.test(prev.tagName)) {
            name = prev.text.trim();
            break;
          }
          prev = prev.previousElementSibling;
        }
        // 如果没找到，再找 table.parentNode 的 previousElementSibling
        if (!name && table.parentNode) {
          let parentPrev = table.parentNode.previousElementSibling;
          while (parentPrev) {
            if (/^H[2-4]$/.test(parentPrev.tagName)) {
              name = parentPrev.text.trim();
              break;
            }
            parentPrev = parentPrev.previousElementSibling;
          }
        }

        // 获取表头
        const ths = table.querySelectorAll('thead th').map(th => th.text.trim());
        // 获取表体
        const rows = table.querySelectorAll('tbody tr').map(tr => {
          const tds = tr.querySelectorAll('td');
          const obj: any = {};
          ths.forEach((key, idx) => {
            let td = tds[idx];
            if (!td) {
              obj[key] = '';
              return;
            }
            // 检查是否有 span（版本号）
            const span = td.querySelector('span');
            if (span && /^\d+\.\d+\.\d+/.test(span.text.trim())) {
              obj['版本号'] = span.text.trim();
              let textWithoutVersion = td.structuredText.replace(span.text.trim(), '').trim();
              obj[key] = textWithoutVersion;
            } else {
              obj[key] = td.text.trim();
            }
          });

          // 统一 name 字段
          const nameKeys = ['属性名', '参数名', '方法名', '事件名', '名称', '插槽名'];
          for (const k of nameKeys) {
            if (obj[k]) {
              obj.name = obj[k];
              break;
            }
          }
          return obj;
        });

        result.push({
          name,
          columns: ths,
          rows,
        });
      });

      const componentsMap: Record<string, any> = {};

      result.forEach(table => {
        // 解析组件名和表格类型
        // 例如 name: "ButtonGroup Attributes" 或 "Button Props"
        const match = table.name.match(/^([A-Za-z0-9\u4e00-\u9fa5]+)\s+(.+)$/);
        let compName = 'El' + component.charAt(0).toUpperCase() + component.slice(1); // 默认
        let tableType = table.name;
        if (match) {
          compName = 'El' + match[1].replace(/[\s-]/g, '');
          tableType = match[2];
        }

        // 初始化
        if (!componentsMap[compName]) {
          componentsMap[compName] = {
            name: compName,
            props: {},
            events: [],
            methods: [],
            slots: [],
            exposed: [],
            typeDetail: {},
            link,
            link_zh: componentUrl,
          };
        }
        const comp = componentsMap[compName];

        // 属性/Props
        if (/props|属性|attributes/i.test(tableType)) {
          table.rows.forEach((row: any) => {
            if (!row.name) return;
            comp.props[row.name] = {
              default: row['默认值'] ?? row['默认'] ?? '',
              value: row['说明'] ?? row['描述'] ?? '',
              type: row['类型'] ?? '',
              version: row['版本号'] ?? '',
              description: row['说明'] ?? row['描述'] ?? '',
              required: /是|true/i.test(row['必填'] ?? row['required'] ?? ''),
            };
          });
        }
        // 事件/Events
        else if (/event|事件/i.test(tableType)) {
          table.rows.forEach((row: any) => {
            if (!row.name) return;
            comp.events.push({
              name: row.name,
              description: row['说明'] ?? row['描述'] ?? '',
              params: row['参数'] ?? '',
              value: row['返回值'] ?? '',
              version: row['版本号'] ?? '',
            });
          });
        }
        // 方法/Methods
        else if (/method|方法/i.test(tableType)) {
          table.rows.forEach((row: any) => {
            if (!row.name) return;
            comp.methods.push({
              name: row.name,
              description: row['说明'] ?? row['描述'] ?? '',
              params: row['参数'] ?? '',
              value: row['返回值'] ?? '',
              version: row['版本号'] ?? '',
            });
          });
        }
        // 插槽/Slots
        else if (/slot|插槽/i.test(tableType)) {
          table.rows.forEach((row: any) => {
            if (!row.name) return;
            comp.slots.push({
              name: row.name,
              description: row['说明'] ?? row['描述'] ?? '',
              params: row['参数'] ?? '',
              version: row['版本号'] ?? '',
            });
          });
        }
        // 暴露/Exposed
        else if (/expose|暴露|exposed/i.test(tableType)) {
          table.rows.forEach((row: any) => {
            if (!row.name) return;
            comp.exposed.push({
              name: row.name,
              description: row['说明'] ?? row['描述'] ?? '',
              detail: row['详细'] ?? row['detail'] ?? '',
              version: row['版本号'] ?? '',
            });
          });
        }
        // 类型详情/typeDetail
        else if (/类型|type/i.test(tableType)) {
          comp.typeDetail[tableType] = table.rows;
        }
      });

      // 输出所有组件
      console.log(JSON.stringify(Object.values(componentsMap), null, 2));

      // 输出所有组件到 scripts/components 目录
      const outputDir = path.resolve(__dirname, 'components');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      Object.values(componentsMap).forEach((comp: any) => {
        const filePath = path.join(outputDir, `${comp.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(comp, null, 2), 'utf-8');
      });

      // 仍然可以输出到控制台
      console.log(JSON.stringify(Object.values(componentsMap), null, 2));
    });
})
