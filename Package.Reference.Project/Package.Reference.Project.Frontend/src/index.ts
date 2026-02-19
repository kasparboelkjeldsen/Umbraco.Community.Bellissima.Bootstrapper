import { UmbEntryPointOnInit } from '@umbraco-cms/backoffice/extension-api';
import { ManifestSection, ManifestSectionView, ManifestSectionSidebarApp } from '@umbraco-cms/backoffice/extension-registry';
import { OpenAPI } from './api/index.ts';

export const onInit: UmbEntryPointOnInit = async (_host, extensionRegistry) => {
    
    const section : ManifestSection = {
        alias: 'myCustomSection',
        name: 'My Custom Section',
        type: 'section',
        meta: {
            label: 'Bellissima',
            pathname: 'Bellissima'
        }
    }

    const view : ManifestSectionView = {
        alias: 'myCustomSectionView',
        name: 'My Custom Section View',
        type: "sectionView",
        elementName: "Bellissima-section-view",
        js: () => import('./elements/section-view'),
        meta: {
            label: 'Bellissima',
            pathname: 'Bellissima',
            icon: 'icon-umb-contour',
        },
        conditions: [
            {
                alias: 'Umb.Condition.SectionAlias',
                match: 'myCustomSection'
            }
        ]
    }

    const tree : ManifestSectionSidebarApp = {
        alias: 'myCustomSectionTree',
        name: 'My Custom Section Tree',
        type: 'sectionSidebarApp',
        elementName: 'Bellissima-section-tree',
        js: () => import('./elements/section-tree'),
        conditions: [
            {
                alias: 'Umb.Condition.SectionAlias',
                match: 'myCustomSection'
            }
        ]
    }
    
    extensionRegistry.register(section);
    extensionRegistry.register(view);
    extensionRegistry.register(tree);
};
